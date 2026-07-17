import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import { pinoHttp } from 'pino-http'
import { z } from 'zod'

import type { Notification } from './domain.js'
import type { NotificationHub } from './hub.js'
import { logger as defaultLogger, type Logger } from './logger.js'
import type { NotificationStore } from './store.js'

export interface AuthenticatedUser {
  id: number
  display_name: string
}

export type Authenticate = (authorization: string) => Promise<AuthenticatedUser>

export function djangoAuthenticator(backendUrl: string): Authenticate {
  return async (authorization) => {
    const response = await fetch(`${backendUrl}/api/me/`, { headers: { authorization } })
    if (!response.ok) throw Object.assign(new Error('Invalid Django token'), { status: 401 })
    return await response.json() as AuthenticatedUser
  }
}

export function createApp(
  store: NotificationStore,
  hub: NotificationHub,
  authenticate: Authenticate,
  appLogger: Logger = defaultLogger,
) {
  const app = express()
  app.use(pinoHttp({
    logger: appLogger,
    genReqId(request, response) {
      const supplied = request.headers['x-request-id']
      const requestId = typeof supplied === 'string' && supplied.trim()
        ? supplied
        : crypto.randomUUID()
      response.setHeader('X-Request-Id', requestId)
      return requestId
    },
    serializers: {
      req(request) {
        return { id: request.id, method: request.method, url: request.url }
      },
      res(response) {
        return { statusCode: response.statusCode }
      },
    },
  }))
  app.use(cors({ origin: true }))
  app.use(express.json())

  async function requireUser(request: Request): Promise<AuthenticatedUser> {
    const authorization = request.header('authorization')
    if (!authorization) throw Object.assign(new Error('Authorization required'), { status: 401 })
    return authenticate(authorization)
  }

  app.get('/health', async (request, response) => {
    const redis = await store.ping().catch(() => false)
    if (!redis) request.log.warn({ dependency: 'redis' }, 'Dependency health check failed')
    response.status(redis ? 200 : 503).json({ status: redis ? 'ok' : 'degraded', redis })
  })

  app.get('/notifications', async (request, response, next) => {
    try {
      const user = await requireUser(request)
      const parsed = z.coerce.number().int().min(1).max(100).catch(20).parse(request.query.limit)
      response.json({ notifications: await store.list(user.id, parsed) })
    } catch (error) {
      next(error)
    }
  })

  app.get('/events', async (request, response, next) => {
    try {
      const user = await requireUser(request)
      response.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      })
      response.write(': connected\n\n')
      const send = (notification: Notification) => {
        response.write(`event: notification\ndata: ${JSON.stringify(notification)}\n\n`)
      }
      const unsubscribe = hub.subscribe(user.id, send)
      request.log.info({ userId: user.id }, 'Live notification stream connected')
      const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 20_000)
      request.on('close', () => {
        clearInterval(heartbeat)
        unsubscribe()
        request.log.info({ userId: user.id }, 'Live notification stream disconnected')
      })
    } catch (error) {
      next(error)
    }
  })

  app.use((error: Error & { status?: number }, request: Request, response: Response, _next: NextFunction) => {
    const status = error.status ?? 500
    if (status >= 500) request.log.error({ err: error, status }, 'Request failed')
    else request.log.warn({ status, reason: error.message }, 'Request rejected')
    response.status(error.status ?? 500).json({ detail: error.status ? error.message : 'Internal server error' })
  })

  return app
}
