defmodule LeaveFlowWorker.Store do
  @channel "leaveflow:notification-events"
  @dedup_ttl_seconds 60 * 60 * 24 * 7
  @save_script """
  if redis.call('SET', KEYS[1], '1', 'NX', 'EX', ARGV[1]) then
    redis.call('LPUSH', KEYS[2], ARGV[2])
    redis.call('LTRIM', KEYS[2], 0, 99)
    redis.call('PUBLISH', KEYS[3], ARGV[2])
    return 1
  end
  return 0
  """

  def save(notification, redis \\ LeaveFlowWorker.Redis) do
    payload = Jason.encode!(notification)
    seen_key = "leaveflow:notification:seen:#{notification["id"]}"
    user_key = "leaveflow:notifications:#{notification["user_id"]}"

    case Redix.command(redis, [
           "EVAL",
           @save_script,
           "3",
           seen_key,
           user_key,
           @channel,
           Integer.to_string(@dedup_ttl_seconds),
           payload
         ]) do
      {:ok, 1} -> {:ok, :saved}
      {:ok, 0} -> {:ok, :duplicate}
      {:error, reason} -> {:error, reason}
    end
  end
end
