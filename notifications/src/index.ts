import { createClient } from 'redis'

import { createApp, djangoAuthenticator } from './app.js'
import { NotificationHub } from './hub.js'
import { logger } from './logger.js'
import { RedisNotificationStore } from './store.js'
import { EventWorker } from './worker.js'

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'
const port = Number(process.env.PORT ?? 3000)

const redis = createClient({ url: redisUrl })
const workerRedis = redis.duplicate()
redis.on('error', (error) => logger.error({ err: error, client: 'commands' }, 'Redis client error'))
workerRedis.on('error', (error) => logger.error({ err: error, client: 'worker' }, 'Redis client error'))
await Promise.all([redis.connect(), workerRedis.connect()])

const store = new RedisNotificationStore(redis)
const hub = new NotificationHub()
const worker = new EventWorker(workerRedis, store, hub)
const app = createApp(store, hub, djangoAuthenticator(backendUrl))
const server = app.listen(port, () => logger.info({ port }, 'Notification service listening'))
worker.run().catch((error) => {
  logger.fatal({ err: error }, 'Event worker stopped unexpectedly')
  process.exitCode = 1
})

async function shutdown(signal: string) {
  logger.info({ signal }, 'Graceful shutdown started')
  worker.stop()
  await new Promise<void>((resolve) => server.close(() => resolve()))
  await Promise.allSettled([redis.quit(), workerRedis.quit()])
  logger.info('Graceful shutdown completed')
}

process.once('SIGTERM', () => void shutdown('SIGTERM'))
process.once('SIGINT', () => void shutdown('SIGINT'))
