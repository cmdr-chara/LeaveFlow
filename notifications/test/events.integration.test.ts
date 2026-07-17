import type { AddressInfo } from 'node:net'

import { describe, expect, it } from 'vitest'

import { createApp } from '../src/app.js'
import { leaveEventSchema, notificationsFromEvent } from '../src/domain.js'
import { NotificationHub } from '../src/hub.js'
import { createLogger } from '../src/logger.js'
import { MemoryNotificationStore } from '../src/store.js'
import { EventWorker } from '../src/worker.js'

const testLogger = createLogger({ enabled: false })
const event = leaveEventSchema.parse({
  id: '7cd631cb-d6aa-4142-bd3d-4acb43ef8e26',
  type: 'leave.requested',
  occurred_at: '2026-07-17T12:00:00Z',
  recipients: [2],
  actor: { id: 7, display_name: 'Elena Employee' },
  request: {
    id: 51,
    employee_id: 7,
    employee_name: 'Elena Employee',
    leave_type: 'vacation',
    start_date: '2026-09-07',
    end_date: '2026-09-11',
    status: 'pending',
  },
})

describe('event delivery integration', () => {
  it('processes, persists and publishes each event only once', async () => {
    const store = new MemoryNotificationStore()
    const hub = new NotificationHub()
    const received: string[] = []
    const unsubscribe = hub.subscribe(2, (notification) => received.push(notification.id))
    const worker = new EventWorker({}, store, hub, 'test-worker', testLogger)

    await worker.processPayload(JSON.stringify(event))
    await worker.processPayload(JSON.stringify(event))
    unsubscribe()

    expect(received).toEqual([`${event.id}:2`])
    expect(await store.list(2, 20)).toHaveLength(1)
  })

  it('streams a published notification over an authenticated SSE connection', async () => {
    const store = new MemoryNotificationStore()
    const hub = new NotificationHub()
    const app = createApp(
      store,
      hub,
      async () => ({ id: 2, display_name: 'Mario Manager' }),
      testLogger,
    )
    const server = app.listen(0, '127.0.0.1')
    await new Promise<void>((resolve) => server.once('listening', resolve))
    const { port } = server.address() as AddressInfo

    try {
      const response = await fetch(`http://127.0.0.1:${port}/events`, {
        headers: { Authorization: 'Token integration-test' },
      })
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('text/event-stream')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('Expected an SSE response body')
      const decoder = new TextDecoder()
      const connected = await reader.read()
      expect(decoder.decode(connected.value)).toContain(': connected')

      const [notification] = notificationsFromEvent(event)
      if (!notification) throw new Error('Expected a notification')
      hub.publish(notification)

      const update = await reader.read()
      const payload = decoder.decode(update.value)
      expect(payload).toContain('event: notification')
      expect(payload).toContain(`\"id\":\"${event.id}:2\"`)
      await reader.cancel()
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})
