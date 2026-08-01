defmodule LeaveFlowWorker.DomainTest do
  use ExUnit.Case, async: true

  @event %{
    "id" => "d5722e9b-6ec9-4274-85a0-3ebdf32952a2",
    "type" => "leave.approved",
    "occurred_at" => "2026-07-17T10:00:00Z",
    "recipients" => [7],
    "actor" => %{"id" => 2, "display_name" => "Mario Manager"},
    "request" => %{
      "id" => 42,
      "employee_id" => 7,
      "employee_name" => "Elena Employee",
      "leave_type" => "vacation",
      "start_date" => "2026-08-10",
      "end_date" => "2026-08-14",
      "status" => "approved"
    }
  }

  test "maps a valid leave event to recipient notifications" do
    assert {:ok, [notification]} = @event |> Jason.encode!() |> LeaveFlowWorker.Domain.decode()
    assert notification["id"] == "#{@event["id"]}:7"
    assert notification["user_id"] == 7
    assert notification["title"] == "Richiesta approvata"
    assert notification["message"] =~ "Mario Manager"
    assert notification["request_id"] == 42
  end

  test "rejects malformed and unsupported events" do
    assert {:error, :invalid_json} = LeaveFlowWorker.Domain.decode("not-json")

    invalid = put_in(@event, ["type"], "leave.deleted")

    assert {:error, :invalid_event_type} =
             invalid |> Jason.encode!() |> LeaveFlowWorker.Domain.decode()
  end
end
