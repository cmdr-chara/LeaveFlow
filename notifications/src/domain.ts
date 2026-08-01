import { z } from 'zod'

export const notificationSchema = z.object({
  id: z.string().min(1),
  user_id: z.number().int().positive(),
  type: z.enum(['leave.requested', 'leave.approved', 'leave.rejected']),
  title: z.string(),
  message: z.string(),
  occurred_at: z.string(),
  request_id: z.number().int().positive(),
  actor_name: z.string(),
  employee_name: z.string(),
  start_date: z.string(),
  end_date: z.string(),
})

export type Notification = z.infer<typeof notificationSchema>
