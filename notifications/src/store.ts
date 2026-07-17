import type { Notification } from './domain.js'

export interface NotificationStore {
  save(notification: Notification): Promise<boolean>
  list(userId: number, limit: number): Promise<Notification[]>
  ping(): Promise<boolean>
}

export class RedisNotificationStore implements NotificationStore {
  constructor(private readonly redis: any) {}

  async save(notification: Notification): Promise<boolean> {
    const firstDelivery = await this.redis.set(
      `leaveflow:notification:seen:${notification.id}`,
      '1',
      { NX: true, EX: 60 * 60 * 24 * 7 },
    )
    if (!firstDelivery) return false

    const key = `leaveflow:notifications:${notification.user_id}`
    await this.redis.multi()
      .lPush(key, JSON.stringify(notification))
      .lTrim(key, 0, 99)
      .exec()
    return true
  }

  async list(userId: number, limit: number): Promise<Notification[]> {
    const values: string[] = await this.redis.lRange(
      `leaveflow:notifications:${userId}`,
      0,
      Math.max(0, limit - 1),
    )
    return values.map((value) => JSON.parse(value) as Notification)
  }

  async ping(): Promise<boolean> {
    return (await this.redis.ping()) === 'PONG'
  }
}

export class MemoryNotificationStore implements NotificationStore {
  private readonly notifications = new Map<number, Notification[]>()
  private readonly seen = new Set<string>()

  async save(notification: Notification): Promise<boolean> {
    if (this.seen.has(notification.id)) return false
    this.seen.add(notification.id)
    const current = this.notifications.get(notification.user_id) ?? []
    this.notifications.set(notification.user_id, [notification, ...current].slice(0, 100))
    return true
  }

  async list(userId: number, limit: number): Promise<Notification[]> {
    return (this.notifications.get(userId) ?? []).slice(0, limit)
  }

  async ping(): Promise<boolean> {
    return true
  }
}
