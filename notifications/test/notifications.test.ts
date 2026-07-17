import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createApp } from '../src/app.js'
import { leaveEventSchema, notificationsFromEvent } from '../src/domain.js'
import { NotificationHub } from '../src/hub.js'
import { createLogger } from '../src/logger.js'
import { MemoryNotificationStore } from '../src/store.js'

const testLogger = createLogger({ enabled: false })

const event = leaveEventSchema.parse({
  id: 'd5722e9b-6ec9-4274-85a0-3ebdf32952a2',
  type: 'leave.approved',
  occurred_at: '2026-07-17T10:00:00Z',
  recipients: [7],
  actor: { id: 2, display_name: 'Mario Manager' },
  request: {
    id: 42,
    employee_id: 7,
    employee_name: 'Elena Employee',
    leave_type: 'vacation',
    start_date: '2026-08-10',
    end_date: '2026-08-14',
    status: 'approved',
  },
})

describe('notification service', () => {
  it('maps a leave event to a user notification', () => {
    const [notification] = notificationsFromEvent(event)
    expect(notification?.user_id).toBe(7)
    expect(notification?.title).toBe('Richiesta approvata')
    expect(notification?.message).toContain('Mario Manager')
    expect(notification?.actor_name).toBe('Mario Manager')
    expect(notification?.employee_name).toBe('Elena Employee')
    expect(notification?.start_date).toBe('2026-08-10')
  })

  it('returns only notifications for the authenticated user', async () => {
    const store = new MemoryNotificationStore()
    const [notification] = notificationsFromEvent(event)
    if (!notification) throw new Error('Expected notification')
    await store.save(notification)
    const app = createApp(
      store,
      new NotificationHub(),
      async () => ({ id: 7, display_name: 'Elena' }),
      testLogger,
    )

    const response = await request(app).get('/notifications').set('Authorization', 'Token demo')
    expect(response.status).toBe(200)
    expect(response.body.notifications).toHaveLength(1)
    expect(response.body.notifications[0].request_id).toBe(42)
  })

  it('rejects requests without a Django token', async () => {
    const app = createApp(
      new MemoryNotificationStore(),
      new NotificationHub(),
      async () => ({ id: 7, display_name: 'Elena' }),
      testLogger,
    )
    const response = await request(app).get('/notifications')
    expect(response.status).toBe(401)
  })

  it('reports a degraded dependency and propagates request IDs', async () => {
    class DegradedStore extends MemoryNotificationStore {
      override async ping(): Promise<boolean> {
        return false
      }
    }

    const app = createApp(
      new DegradedStore(),
      new NotificationHub(),
      async () => ({ id: 7, display_name: 'Elena' }),
      testLogger,
    )
    const response = await request(app).get('/health').set('X-Request-Id', 'health-check-42')

    expect(response.status).toBe(503)
    expect(response.headers['x-request-id']).toBe('health-check-42')
    expect(response.body).toEqual({ status: 'degraded', redis: false })
  })

  it('deduplicates notifications by event and recipient', async () => {
    const store = new MemoryNotificationStore()
    const [notification] = notificationsFromEvent(event)
    if (!notification) throw new Error('Expected notification')
    expect(await store.save(notification)).toBe(true)
    expect(await store.save(notification)).toBe(false)
  })
})
