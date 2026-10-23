import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(z.object({ name: z.string().min(1) }));

  it('returns the parsed value when valid', () => {
    expect(pipe.transform({ name: 'Negroni' })).toEqual({ name: 'Negroni' });
  });

  it('throws BadRequestException with issues when invalid', () => {
    expect(() => pipe.transform({ name: '' })).toThrow(BadRequestException);
  });
});
