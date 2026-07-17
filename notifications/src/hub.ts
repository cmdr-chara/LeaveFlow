import { EventEmitter } from 'node:events'
import type { Notification } from './domain.js'

export class NotificationHub extends EventEmitter {
  publish(notification: Notification): void {
    this.emit(`user:${notification.user_id}`, notification)
  }

  subscribe(userId: number, listener: (notification: Notification) => void): () => void {
    const channel = `user:${userId}`
    this.on(channel, listener)
    return () => this.off(channel, listener)
  }
}
