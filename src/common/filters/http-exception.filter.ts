import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

/**
 * Keys every response body gets from this filter, plus Nest's own
 * `statusCode`. Only fields beyond these are passed through from the
 * exception's body, so the built-in exceptions keep their current shape.
 */
const STANDARD_KEYS = new Set(['message', 'error', 'status', 'statusCode']);

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string;
    let extra: Record<string, unknown> = {};

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as Record<string, unknown>;
      message = (responseObj.message as string) || exception.message;

      // Handle validation errors — include field-level details
      if (Array.isArray(responseObj.message)) {
        response.status(status).json({
          message: 'Validation failed',
          errors: responseObj.message,
          error: exception.name,
          status,
        });
        return;
      }

      // Machine-readable fields an exception adds (e.g. `code` and `missing`
      // on the SUP-1141 incomplete-registrant 422) reach the client.
      extra = Object.fromEntries(
        Object.entries(responseObj).filter(([key]) => !STANDARD_KEYS.has(key)),
      );
    } else {
      message = exception.message;
    }

    response.status(status).json({
      ...extra,
      message,
      error: exception.name,
      status,
    });
  }
}
