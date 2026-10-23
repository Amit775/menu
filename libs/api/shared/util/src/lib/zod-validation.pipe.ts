import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { type z } from 'zod';

/**
 * Validates a request body, query or param against a schema from
 * `@menu/shared/contracts` and returns the parsed (typed) value.
 *
 * @example
 *   create(@Body(new ZodValidationPipe(CreateItemSchema)) body: CreateItem)
 */
export class ZodValidationPipe<TSchema extends z.ZodType>
  implements PipeTransform<unknown, z.output<TSchema>>
{
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.output<TSchema> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        issues: result.error.issues.map((issue) => ({
          path: issue.path.filter((key) => typeof key !== 'symbol'),
          message: issue.message,
        })),
      });
    }
    return result.data;
  }
}
