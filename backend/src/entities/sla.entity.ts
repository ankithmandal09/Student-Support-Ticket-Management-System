import { Column, Entity, PrimaryColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Priority } from '../common/enums.js';
@Entity('sla_policies')
export class SlaPolicy {
  @ApiProperty({ enum: Priority })
  @PrimaryColumn({ type: 'varchar' })
  priority: Priority;
  @ApiProperty({ example: 240 })
  @Column({ type: 'integer' })
  responseMinutes: number;
  @ApiProperty({ example: 1440 })
  @Column({ type: 'integer' })
  resolutionMinutes: number;
}
