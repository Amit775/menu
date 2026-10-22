import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { type ApiError } from '@menu/shared/contracts';

/** The subset of the HTTP response this filter needs (keeps it adapter-agnostic). */
interface JsonResponse {
  status(code: number): { json(body: unknown): void };
}

/** Maps every thrown error to the shared `ApiError` contract. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<JsonResponse>();
    const body = this.toApiError(exception);
    if (body.statusCode >= 500) {
      this.logger.error(exception);
    }
    response.status(body.statusCode).json(body);
  }

  private toApiError(exception: unknown): ApiError {
    if (!(exception instanceof HttpException)) {
      return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
    }
    const statusCode = exception.getStatus();
    const payload = exception.getResponse();
    if (typeof payload === 'string') {
      return { statusCode, message: payload };
    }
    const { message, issues } = payload as { message?: unknown; issues?: ApiError['issues'] };
    return {
      statusCode,
      message: typeof message === 'string' ? message : exception.message,
      ...(issues ? { issues } : {}),
    };
  }
}
