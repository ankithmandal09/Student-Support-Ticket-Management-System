import { ApiProperty } from '@nestjs/swagger';
export class Workload {
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Null represents unassigned active tickets.',
  })
  assignedTo: string | null;
  @ApiProperty() count: number;
}
export class DashboardResponse {
  @ApiProperty() total: number;
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'integer' },
    example: { NEW: 2, IN_PROGRESS: 3 },
  })
  byStatus: Record<string, number>;
  @ApiProperty({
    description:
      'Active tickets whose current response or resolution SLA is breached.',
  })
  breached: number;
  @ApiProperty() atRisk: number;
  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Mean current-cycle resolution time excluding student pauses; null if no resolved tickets.',
  })
  averageResolutionMinutes: number | null;
  @ApiProperty({ type: [Workload] }) workload: Workload[];
}
