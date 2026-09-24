import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
export class UpdateSlaDto {
  @ApiProperty({
    example: 120,
    minimum: 1,
    maximum: 43200,
    description:
      'Response deadline in calendar minutes; applies to new/reopened/reprioritized tickets.',
  })
  @IsInt()
  @Min(1)
  @Max(43200)
  responseMinutes: number;
  @ApiProperty({
    example: 480,
    minimum: 1,
    maximum: 43200,
    description:
      'Must be at least responseMinutes. Existing tickets retain their SLA snapshot.',
  })
  @IsInt()
  @Min(1)
  @Max(43200)
  resolutionMinutes: number;
}
export class SweepResult {
  @ApiProperty({ description: 'Number of new escalation events recorded.' })
  escalated: number;
}
