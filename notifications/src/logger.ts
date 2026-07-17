import pino, { type Logger, type LoggerOptions } from 'pino'

const defaultOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? 'info',
  base: {
    service: 'leaveflow-notifications',
    environment: process.env.NODE_ENV ?? 'development',
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'request.headers.authorization',
      'authorization',
    ],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
}

export function createLogger(options: LoggerOptions = {}): Logger {
  return pino({ ...defaultOptions, ...options })
}

export const logger = createLogger()
export type { Logger }
