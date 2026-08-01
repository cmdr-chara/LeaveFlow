defmodule LeaveFlowWorker.Worker do
  use GenServer
  require Logger

  @stream "leaveflow:events"
  @group "leaveflow-notifications"
  @poll_timeout 2_000

  def start_link(options \\ []) do
    GenServer.start_link(__MODULE__, options, name: __MODULE__)
  end

  @impl true
  def init(options) do
    state = %{
      redis: Keyword.get(options, :redis, LeaveFlowWorker.Redis),
      stream_redis: Keyword.get(options, :stream_redis, LeaveFlowWorker.StreamRedis),
      consumer:
        Keyword.get_lazy(options, :consumer, fn ->
          "notifications-#{System.pid()}-#{System.unique_integer([:positive])}"
        end)
    }

    {:ok, state, {:continue, :setup}}
  end

  @impl true
  def handle_continue(:setup, state) do
    case ensure_group(state.redis) do
      :ok ->
        send(self(), :poll)
        {:noreply, state}

      {:error, reason} ->
        Logger.error("Unable to create Redis consumer group: #{inspect(reason)}")
        {:stop, reason, state}
    end
  end

  @impl true
  def handle_info(:poll, state) do
    case read_entries(state.stream_redis, state.consumer) do
      {:ok, entries} ->
        Enum.each(entries, &process_entry(&1, state.redis))

      {:error, reason} ->
        Logger.error("Unable to read leave events: #{inspect(reason)}")
        Process.sleep(500)
    end

    send(self(), :poll)
    {:noreply, state}
  end

  def process_payload(payload, redis \\ LeaveFlowWorker.Redis) do
    with {:ok, notifications} <- LeaveFlowWorker.Domain.decode(payload) do
      Enum.reduce_while(notifications, {:ok, 0}, fn notification, {:ok, delivered} ->
        with {:ok, status} <- LeaveFlowWorker.Store.save(notification, redis) do
          count = if status == :saved, do: delivered + 1, else: delivered
          {:cont, {:ok, count}}
        else
          {:error, reason} -> {:halt, {:error, reason}}
        end
      end)
    end
  end

  defp ensure_group(redis) do
    case Redix.command(redis, ["XGROUP", "CREATE", @stream, @group, "0", "MKSTREAM"]) do
      {:ok, "OK"} -> :ok
      {:error, %Redix.Error{message: "BUSYGROUP" <> _rest}} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end

  defp read_entries(redis, consumer) do
    case Redix.command(redis, [
           "XREADGROUP",
           "GROUP",
           @group,
           consumer,
           "COUNT",
           "10",
           "BLOCK",
           Integer.to_string(@poll_timeout),
           "STREAMS",
           @stream,
           ">"
         ]) do
      {:ok, nil} -> {:ok, []}
      {:ok, streams} -> {:ok, parse_entries(streams)}
      {:error, reason} -> {:error, reason}
    end
  end

  defp parse_entries(streams) do
    for [_stream, entries] <- streams,
        [entry_id, fields] <- entries do
      {entry_id, field_value(fields, "payload")}
    end
  end

  defp field_value(fields, wanted) do
    fields
    |> Enum.chunk_every(2)
    |> Enum.find_value(fn
      [^wanted, value] -> value
      _pair -> nil
    end)
  end

  defp process_entry({entry_id, nil}, _redis) do
    Logger.error("Event payload is missing for Redis entry #{entry_id}")
  end

  defp process_entry({entry_id, payload}, redis) do
    case process_payload(payload, redis) do
      {:ok, delivered} ->
        case Redix.command(redis, ["XACK", @stream, @group, entry_id]) do
          {:ok, _count} ->
            Logger.info("Processed leave event entry=#{entry_id} delivered=#{delivered}")

          {:error, reason} ->
            Logger.error("Unable to acknowledge Redis entry #{entry_id}: #{inspect(reason)}")
        end

      {:error, reason} ->
        Logger.error("Unable to process Redis entry #{entry_id}: #{inspect(reason)}")
    end
  end
end
