import pino, { type Logger } from 'pino';

const logger: Logger = (pino.default ?? pino)({
  level: process.env.LOG_LEVEL ?? 'info',
  base: {
    env: process.env.NODE_ENV ?? 'development',
  },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    censor: '***REDACTED***',
  },
});

export const requestLogger = logger.child({ component: 'http' });
export const wsLogger = logger.child({ component: 'websocket' });
export const redisLogger = logger.child({ component: 'redis' });
export const appLogger = logger.child({ component: 'app' });

export default logger;

