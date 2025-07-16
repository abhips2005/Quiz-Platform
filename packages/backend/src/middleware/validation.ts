import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { createError } from './errorHandler';

export const validateRequest = (schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }
      
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        console.error('Validation error:', {
          errors: error.errors,
          body: req.body,
          path: req.path
        });
        next(error);
      } else {
        next(createError('Validation failed', 400));
      }
    }
  };
};

export const validateBody = (schema: ZodSchema) => {
  return validateRequest({ body: schema });
};

export const validateQuery = (schema: ZodSchema) => {
  return validateRequest({ query: schema });
};

export const validateParams = (schema: ZodSchema) => {
  return validateRequest({ params: schema });
}; 