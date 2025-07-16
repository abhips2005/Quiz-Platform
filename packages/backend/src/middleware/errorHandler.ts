import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let details = error.details || null;

  // Log error for debugging
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    user: (req as any).user?.id || 'anonymous'
  });

  // Handle specific error types
  if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        statusCode = 409;
        message = 'A record with this information already exists';
        details = { field: error.meta?.target };
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Record not found';
        break;
      case 'P2003':
        statusCode = 400;
        message = 'Foreign key constraint failed';
        break;
      case 'P2014':
        statusCode = 400;
        message = 'Invalid relation';
        break;
      default:
        statusCode = 500;
        message = 'Database error';
        break;
    }
  } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    statusCode = 500;
    message = 'Unknown database error';
  } else if (error instanceof Prisma.PrismaClientRustPanicError) {
    statusCode = 500;
    message = 'Database connection error';
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 500;
    message = 'Database initialization error';
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Database validation error';
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Handle multer errors (file upload)
  if (error.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File too large';
  } else if (error.code === 'LIMIT_FILE_COUNT') {
    statusCode = 400;
    message = 'Too many files';
  } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Unexpected file field';
  }

  // Don't expose sensitive error details in production
  if (process.env.NODE_ENV === 'production') {
    if (statusCode >= 500) {
      message = 'Internal Server Error';
      details = null;
    }
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    details,
    timestamp: new Date(),
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack
    })
  });
};

export const createError = (message: string, statusCode: number = 500, details?: any): CustomError => {
  const error = new Error(message) as CustomError;
  error.statusCode = statusCode;
  error.details = details;
  return error;
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
}; 