import type { AddressInfo } from 'node:net'

import { describe, expect, it } from 'vitest'

import { createApp } from '../src/app.js'
import { NotificationHub } from '../src/hub.js'
import { createLogger } from '../src/logger.js'
import { MemoryNotificationStore } from '../src/store.js'
import { LiveNotificationSubscriber } from '../src/subscriber.js'
import { notification } from './fixture.js'

const testLogger = createLogger({ enabled: false })

class FakeSubscriberRedis {
  private listener?: (payload: string) => void

  async subscribe(_channel: string, listener: (payload: string) => void): Promise<void> {
    this.listener = listener
  }

  async unsubscribe(_channel: string): Promise<void> {
    this.listener = undefined
  }

  emit(payload: string): void {
    this.listener?.(payload)
  }
}

describe('live notification delivery', () => {
  it('validates Redis messages before publishing them', async () => {
    const redis = new FakeSubscriberRedis()
    const hub = new NotificationHub()
    const received: string[] = []
    hub.subscribe(7, (item) => received.push(item.id))
    const subscriber = new LiveNotificationSubscriber(redis as never, hub, testLogger)

    await subscriber.run()
    redis.emit(JSON.stringify(notification))
    redis.emit(JSON.stringify({ id: 'invalid' }))

    expect(received).toEqual([notification.id])
    await subscriber.stop()
  })

  it('streams a published notification over an authenticated SSE connection', async () => {
    const store = new MemoryNotificationStore()
    const hub = new NotificationHub()
    const app = createApp(
      store,
      hub,
      async () => ({ id: 7, display_name: 'Elena Employee' }),
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

      hub.publish(notification)

      const update = await reader.read()
      const payload = decoder.decode(update.value)
      expect(payload).toContain('event: notification')
      expect(payload).toContain(`\"id\":\"${notification.id}\"`)
      await reader.cancel()
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})
