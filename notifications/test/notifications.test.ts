import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createApp } from '../src/app.js'
import { notificationSchema } from '../src/domain.js'
import { NotificationHub } from '../src/hub.js'
import { createLogger } from '../src/logger.js'
import { MemoryNotificationStore } from '../src/store.js'
import { notification } from './fixture.js'

const testLogger = createLogger({ enabled: false })

describe('notification service', () => {
  it('validates worker notifications at the gateway boundary', () => {
    expect(notificationSchema.parse(notification)).toEqual(notification)
    expect(notificationSchema.safeParse({ id: 'invalid' }).success).toBe(false)
  })

  it('returns only notifications for the authenticated user', async () => {
    const store = new MemoryNotificationStore()
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
    expect(await store.save(notification)).toBe(true)
    expect(await store.save(notification)).toBe(false)
  })
})
