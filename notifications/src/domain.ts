import { z } from 'zod'

export const leaveEventSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['leave.requested', 'leave.approved', 'leave.rejected']),
  occurred_at: z.string(),
  recipients: z.array(z.number().int().positive()),
  actor: z.object({ id: z.number().int().positive(), display_name: z.string() }),
  request: z.object({
    id: z.number().int().positive(),
    employee_id: z.number().int().positive(),
    employee_name: z.string(),
    leave_type: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    status: z.enum(['pending', 'approved', 'rejected']),
  }),
})

export type LeaveEvent = z.infer<typeof leaveEventSchema>

export interface Notification {
  id: string
  user_id: number
  type: LeaveEvent['type']
  title: string
  message: string
  occurred_at: string
  request_id: number
  actor_name: string
  employee_name: string
  start_date: string
  end_date: string
}

export function notificationsFromEvent(event: LeaveEvent): Notification[] {
  const copy = event.type === 'leave.requested'
    ? {
        title: 'Nuova richiesta da valutare',
        message: `${event.request.employee_name} ha richiesto un'assenza dal ${event.request.start_date} al ${event.request.end_date}.`,
      }
    : event.type === 'leave.approved'
      ? {
          title: 'Richiesta approvata',
          message: `${event.actor.display_name} ha approvato la tua richiesta dal ${event.request.start_date} al ${event.request.end_date}.`,
        }
      : {
          title: 'Richiesta rifiutata',
          message: `${event.actor.display_name} ha rifiutato la tua richiesta dal ${event.request.start_date} al ${event.request.end_date}.`,
        }

  return event.recipients.map((userId) => ({
    id: `${event.id}:${userId}`,
    user_id: userId,
    type: event.type,
    title: copy.title,
    message: copy.message,
    occurred_at: event.occurred_at,
    request_id: event.request.id,
    actor_name: event.actor.display_name,
    employee_name: event.request.employee_name,
    start_date: event.request.start_date,
    end_date: event.request.end_date,
  }))
}
