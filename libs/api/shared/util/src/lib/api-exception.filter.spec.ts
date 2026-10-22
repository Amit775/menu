import { type ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiErrorSchema } from '@menu/shared/contracts';
import { ApiExceptionFilter } from './api-exception.filter';

function hostWith(json: (body: unknown) => void, status: (code: number) => void): ArgumentsHost {
  const response = {
    status: (code: number) => {
      status(code);
      return response;
    },
    json,
  };
  return {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
}

describe('ApiExceptionFilter', () => {
  const filter = new ApiExceptionFilter();

  it('maps an HttpException to the ApiError contract', () => {
    const json = vi.fn();
    const status = vi.fn();
    filter.catch(new NotFoundException('Item not found'), hostWith(json, status));
    expect(status).toHaveBeenCalledWith(404);
    expect(ApiErrorSchema.parse(json.mock.calls[0]?.[0])).toEqual({
      statusCode: 404,
      message: 'Item not found',
    });
  });

  it('keeps validation issues', () => {
    const json = vi.fn();
    filter.catch(
      new BadRequestException({
        message: 'Validation failed',
        issues: [{ path: ['name'], message: 'Required' }],
      }),
      hostWith(json, vi.fn()),
    );
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'Validation failed',
      issues: [{ path: ['name'], message: 'Required' }],
    });
  });

  it('hides unknown errors behind a 500', () => {
    const json = vi.fn();
    filter.catch(new Error('boom'), hostWith(json, vi.fn()));
    expect(json).toHaveBeenCalledWith({ statusCode: 500, message: 'Internal server error' });
  });
});
