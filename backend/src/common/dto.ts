import { Transform, Type } from 'class-transformer';
import { IsInt, IsString, Length, Max, Min, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Omitted fields are optional; explicit null is rejected by their validators.
export const Optional = () =>
  ValidateIf((_object, value: unknown) => value !== undefined);
export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
export class PageQuery {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
export class ReasonDto {
  @ApiProperty({
    example: 'The requested certificate still contains an incorrect name.',
    minLength: 3,
    maxLength: 2000,
  })
  @Trim()
  @IsString()
  @Length(3, 2000)
  reason: string;
}
export class ErrorDto {
  @ApiProperty({ example: 400 }) statusCode: number;
  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Invalid ticket transition',
  })
  message: string | string[];
  @ApiProperty({ example: 'Bad Request' }) error: string;
}
