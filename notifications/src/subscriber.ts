import { notificationSchema } from './domain.js'
import { NotificationHub } from './hub.js'
import { logger as defaultLogger } from './logger.js'

const CHANNEL = 'leaveflow:notification-events'

export interface SubscriberClient {
  subscribe(channel: string, listener: (payload: string) => void): Promise<unknown>
  unsubscribe(channel: string): Promise<unknown>
}

export class LiveNotificationSubscriber {
  private stopping = false

  constructor(
    private readonly redis: SubscriberClient,
    private readonly hub: NotificationHub,
    private readonly logger = defaultLogger,
  ) {}

  async run(): Promise<void> {
    await this.redis.subscribe(CHANNEL, (payload) => {
      if (this.stopping) return

      try {
        const parsed = notificationSchema.safeParse(JSON.parse(payload))
        if (!parsed.success) {
          this.logger.error({ issues: parsed.error.issues }, 'Invalid live notification payload')
          return
        }

        this.hub.publish(parsed.data)
        this.logger.info(
          {
            notificationId: parsed.data.id,
            requestId: parsed.data.request_id,
            userId: parsed.data.user_id,
          },
          'Published live notification',
        )
      } catch (error) {
        this.logger.error({ err: error }, 'Malformed live notification payload')
      }
    })
  }

  async stop(): Promise<void> {
    this.stopping = true
    await this.redis.unsubscribe(CHANNEL)
  }
}
