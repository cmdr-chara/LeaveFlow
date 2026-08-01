defmodule LeaveFlowWorker.Application do
  use Application

  @impl true
  def start(_type, _args) do
    redis_url = System.get_env("REDIS_URL", "redis://localhost:6379/0")

    children = [
      Supervisor.child_spec(
        {Redix, {redis_url, [name: LeaveFlowWorker.Redis]}},
        id: LeaveFlowWorker.Redis
      ),
      Supervisor.child_spec(
        {Redix, {redis_url, [name: LeaveFlowWorker.StreamRedis]}},
        id: LeaveFlowWorker.StreamRedis
      ),
      LeaveFlowWorker.Worker
    ]

    Supervisor.start_link(children, strategy: :one_for_one, name: LeaveFlowWorker.Supervisor)
  end
end
