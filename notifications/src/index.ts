import { createClient } from 'redis'

import { createApp, djangoAuthenticator } from './app.js'
import { NotificationHub } from './hub.js'
import { logger } from './logger.js'
import { RedisNotificationStore } from './store.js'
import { LiveNotificationSubscriber } from './subscriber.js'

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'
const port = Number(process.env.PORT ?? 3000)

const redis = createClient({ url: redisUrl })
const subscriberRedis = redis.duplicate()
redis.on('error', (error) => logger.error({ err: error, client: 'commands' }, 'Redis client error'))
subscriberRedis.on('error', (error) => logger.error({ err: error, client: 'subscriber' }, 'Redis client error'))
await Promise.all([redis.connect(), subscriberRedis.connect()])

const store = new RedisNotificationStore(redis)
const hub = new NotificationHub()
const subscriber = new LiveNotificationSubscriber(subscriberRedis, hub)
await subscriber.run()

const app = createApp(store, hub, djangoAuthenticator(backendUrl))
const server = app.listen(port, () => logger.info({ port }, 'Notification gateway listening'))

async function shutdown(signal: string) {
  logger.info({ signal }, 'Graceful shutdown started')
  await subscriber.stop()
  await new Promise<void>((resolve) => server.close(() => resolve()))
  await Promise.allSettled([redis.quit(), subscriberRedis.quit()])
  logger.info('Graceful shutdown completed')
}

process.once('SIGTERM', () => void shutdown('SIGTERM'))
process.once('SIGINT', () => void shutdown('SIGINT'))
