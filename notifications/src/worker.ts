import { leaveEventSchema, notificationsFromEvent } from './domain.js'
import type { NotificationHub } from './hub.js'
import { logger as defaultLogger, type Logger } from './logger.js'
import type { NotificationStore } from './store.js'

const STREAM = 'leaveflow:events'
const GROUP = 'leaveflow-notifications'

export class EventWorker {
  private running = false

  constructor(
    private readonly redis: any,
    private readonly store: NotificationStore,
    private readonly hub: NotificationHub,
    private readonly consumer = `notifications-${process.pid}`,
    private readonly workerLogger: Logger = defaultLogger.child({ component: 'event-worker' }),
  ) {}

  async ensureGroup(): Promise<void> {
    try {
      await this.redis.xGroupCreate(STREAM, GROUP, '0', { MKSTREAM: true })
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('BUSYGROUP')) throw error
    }
  }

  async processPayload(payload: string): Promise<void> {
    const event = leaveEventSchema.parse(JSON.parse(payload))
    let delivered = 0
    for (const notification of notificationsFromEvent(event)) {
      if (await this.store.save(notification)) {
        delivered += 1
        this.hub.publish(notification)
      }
    }
    this.workerLogger.info({
      eventId: event.id,
      eventType: event.type,
      requestId: event.request.id,
      recipients: event.recipients.length,
      delivered,
    }, 'Leave event processed')
  }

  async run(): Promise<void> {
    this.running = true
    await this.ensureGroup()
    while (this.running) {
      const streams = await this.redis.xReadGroup(
        GROUP,
        this.consumer,
        [{ key: STREAM, id: '>' }],
        { COUNT: 10, BLOCK: 2_000 },
      )
      for (const stream of streams ?? []) {
        for (const entry of stream.messages) {
          try {
            const payload = entry.message.payload
            if (typeof payload !== 'string') throw new Error('Event payload is missing')
            await this.processPayload(payload)
            await this.redis.xAck(STREAM, GROUP, entry.id)
          } catch (error) {
            this.workerLogger.error({ err: error, streamEntryId: entry.id }, 'Unable to process event')
          }
        }
      }
    }
  }

  stop(): void {
    this.running = false
  }
}
