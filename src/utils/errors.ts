import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import logger from './logger.js';

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
