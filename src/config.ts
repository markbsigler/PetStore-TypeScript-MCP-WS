import dotenv from 'dotenv';

dotenv.config();

interface Config {
  server: {
    host: string;
    port: number;
  };
  cors: {
    origin: string | string[];
  };
  jwt: {
    secret: string;
  };
  logger: {
    level: 'error' | 'warn' | 'info' | 'debug';
    redaction: string[];
  };
  redis: {
    host: string;
    port: number;
  };
}

export const config: Config = {
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT || '3000'),
  },
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-key',
  },
  logger: {
    level: (process.env.LOG_LEVEL || 'info') as Config['logger']['level'],
    redaction: ['password', 'token', 'authorization', 'jwt'],
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
};
