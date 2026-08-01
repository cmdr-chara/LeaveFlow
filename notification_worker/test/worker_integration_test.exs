defmodule LeaveFlowWorker.WorkerIntegrationTest do
  use ExUnit.Case, async: false

  @moduletag skip: is_nil(System.get_env("REDIS_TEST_URL"))

  @event %{
    "id" => "7cd631cb-d6aa-4142-bd3d-4acb43ef8e26",
    "type" => "leave.requested",
    "occurred_at" => "2026-07-17T12:00:00Z",
    "recipients" => [2],
    "actor" => %{"id" => 7, "display_name" => "Elena Employee"},
    "request" => %{
      "id" => 51,
      "employee_id" => 7,
      "employee_name" => "Elena Employee",
      "leave_type" => "vacation",
      "start_date" => "2026-09-07",
      "end_date" => "2026-09-11",
      "status" => "pending"
    }
  }

  setup do
    url = System.fetch_env!("REDIS_TEST_URL")
    {:ok, redis} = Redix.start_link(url)
    {:ok, pubsub} = Redix.PubSub.start_link(url)

    {:ok, subscription} =
      Redix.PubSub.subscribe(pubsub, "leaveflow:notification-events", self())

    assert_receive {:redix_pubsub, ^pubsub, ^subscription, :subscribed,
                    %{channel: "leaveflow:notification-events"}}

    {:ok, "OK"} = Redix.command(redis, ["FLUSHDB"])

    on_exit(fn ->
      Redix.PubSub.stop(pubsub)
      GenServer.stop(redis)
    end)

    %{redis: redis, pubsub: pubsub, subscription: subscription}
  end

  test "persists, publishes and deduplicates a notification atomically", %{
    redis: redis,
    pubsub: pubsub,
    subscription: subscription
  } do
    payload = Jason.encode!(@event)

    assert {:ok, 1} = LeaveFlowWorker.Worker.process_payload(payload, redis)

    assert_receive {:redix_pubsub, ^pubsub, ^subscription, :message,
                    %{channel: "leaveflow:notification-events", payload: live}}

    assert Jason.decode!(live)["id"] == "#{@event["id"]}:2"
    assert {:ok, 0} = LeaveFlowWorker.Worker.process_payload(payload, redis)
    refute_receive {:redix_pubsub, ^pubsub, ^subscription, :message, _}, 50

    assert {:ok, [stored]} =
             Redix.command(redis, ["LRANGE", "leaveflow:notifications:2", "0", "-1"])

    assert Jason.decode!(stored)["id"] == "#{@event["id"]}:2"
  end
end
