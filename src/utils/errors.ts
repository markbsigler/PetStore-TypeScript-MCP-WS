import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import logger from './logger.ts';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Not authorized') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, false);
  }
}

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // DEBUG: Write the error object and its keys to a file for diagnosis (sync, using require)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    fs.appendFileSync(
      'fastify-error-debug.log',
      `\n[${new Date().toISOString()}] Error: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}\nKeys: ${JSON.stringify(Object.keys(error))}\n`,
      'utf8'
    );
  } catch (e) {
    // fallback to console if file write fails
    // eslint-disable-next-line no-console
    console.error('DEBUG Fastify errorHandler received error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    // eslint-disable-next-line no-console
    console.error('DEBUG Fastify errorHandler error keys:', JSON.stringify(Object.keys(error)));
  }

  const requestLogger = logger.child({
    requestId: request.id,
    method: request.method,
    url: request.url,
  });

  if (error instanceof AppError) {
    requestLogger.error({
      err: error,
      statusCode: error.statusCode,
    });

    return reply.status(error.statusCode).send({
      error: {
        name: error.name,
        message: error.message,
      },
    });
  }

  if (error instanceof ZodError) {
    const validationError = new ValidationError('Validation failed');
    requestLogger.error({
      err: error,
      statusCode: validationError.statusCode,
      validation: error.errors,
    });

    return reply.status(validationError.statusCode).send({
      error: {
        name: validationError.name,
        message: validationError.message,
        details: error.errors,
      },
    });
  }

  // Handle Fastify's built-in validation errors (e.g., from TypeBox)
  // These errors are instances of FastifyError and often have a 'validation' property.
  // They typically carry a statusCode like 400.
  if ('validation' in error && error instanceof Error) {
    const fastifyValidationError = error as FastifyError;
    const statusCode = fastifyValidationError.statusCode || 400; // Default to 400

    requestLogger.warn({
      err: {
        name: fastifyValidationError.name,
        message: fastifyValidationError.message,
        code: fastifyValidationError.code,
        validation: fastifyValidationError.validation,
        validationContext: fastifyValidationError.validationContext,
      },
      statusCode: statusCode,
    }, 'Fastify validation error');

    return reply.status(statusCode).send({
      error: {
        name: fastifyValidationError.name || 'ValidationError',
        message: fastifyValidationError.message,
        // details: fastifyValidationError.validation, // Usually too verbose for client
      },
    });
  }

  // Handle unknown errors
  const internalError = new InternalServerError();
  requestLogger.error({
    err: error,
    statusCode: internalError.statusCode,
  });

  return reply.status(internalError.statusCode).send({
    error: {
      name: internalError.name,
      message: internalError.message,
    },
  });
}
