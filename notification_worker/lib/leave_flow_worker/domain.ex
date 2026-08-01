defmodule LeaveFlowWorker.Domain do
  @event_types ~w(leave.requested leave.approved leave.rejected)
  @statuses ~w(pending approved rejected)
  @uuid ~r/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  def decode(payload) when is_binary(payload) do
    with {:ok, event} <- Jason.decode(payload),
         :ok <- validate(event) do
      {:ok, notifications_from_event(event)}
    else
      {:error, %Jason.DecodeError{}} -> {:error, :invalid_json}
      {:error, reason} -> {:error, reason}
    end
  end

  def decode(_payload), do: {:error, :invalid_payload}

  defp validate(event) when is_map(event) do
    with :ok <- require_string(event, "id"),
         true <- Regex.match?(@uuid, event["id"]) || {:error, :invalid_event_id},
         true <- event["type"] in @event_types || {:error, :invalid_event_type},
         :ok <- require_string(event, "occurred_at"),
         :ok <- validate_recipients(event["recipients"]),
         :ok <- validate_actor(event["actor"]),
         :ok <- validate_request(event["request"]) do
      :ok
    end
  end

  defp validate(_event), do: {:error, :invalid_event}

  defp validate_recipients(recipients)
       when is_list(recipients) and recipients != [] do
    if Enum.all?(recipients, &positive_integer?/1),
      do: :ok,
      else: {:error, :invalid_recipients}
  end

  defp validate_recipients(_recipients), do: {:error, :invalid_recipients}

  defp validate_actor(%{"id" => id, "display_name" => name})
       when is_binary(name) and name != "" do
    if positive_integer?(id), do: :ok, else: {:error, :invalid_actor}
  end

  defp validate_actor(_actor), do: {:error, :invalid_actor}

  defp validate_request(request) when is_map(request) do
    with true <- positive_integer?(request["id"]) || {:error, :invalid_request},
         true <- positive_integer?(request["employee_id"]) || {:error, :invalid_request},
         :ok <- require_string(request, "employee_name"),
         :ok <- require_string(request, "leave_type"),
         :ok <- require_string(request, "start_date"),
         :ok <- require_string(request, "end_date"),
         true <- request["status"] in @statuses || {:error, :invalid_request_status} do
      :ok
    end
  end

  defp validate_request(_request), do: {:error, :invalid_request}

  defp require_string(map, key) do
    if is_binary(map[key]) and map[key] != "",
      do: :ok,
      else: {:error, {:invalid_field, key}}
  end

  defp positive_integer?(value), do: is_integer(value) and value > 0

  defp notifications_from_event(event) do
    copy = copy_for(event)

    Enum.map(event["recipients"], fn user_id ->
      %{
        "id" => "#{event["id"]}:#{user_id}",
        "user_id" => user_id,
        "type" => event["type"],
        "title" => copy.title,
        "message" => copy.message,
        "occurred_at" => event["occurred_at"],
        "request_id" => event["request"]["id"],
        "actor_name" => event["actor"]["display_name"],
        "employee_name" => event["request"]["employee_name"],
        "start_date" => event["request"]["start_date"],
        "end_date" => event["request"]["end_date"]
      }
    end)
  end

  defp copy_for(%{"type" => "leave.requested", "request" => request}) do
    %{
      title: "Nuova richiesta da valutare",
      message:
        "#{request["employee_name"]} ha richiesto un'assenza dal #{request["start_date"]} al #{request["end_date"]}."
    }
  end

  defp copy_for(%{"type" => "leave.approved"} = event) do
    decision_copy(event, "approvato", "Richiesta approvata")
  end

  defp copy_for(%{"type" => "leave.rejected"} = event) do
    decision_copy(event, "rifiutato", "Richiesta rifiutata")
  end

  defp decision_copy(event, verb, title) do
    %{
      title: title,
      message:
        "#{event["actor"]["display_name"]} ha #{verb} la tua richiesta dal #{event["request"]["start_date"]} al #{event["request"]["end_date"]}."
    }
  end
end
