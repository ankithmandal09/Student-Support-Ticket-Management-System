import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
@Entity('ticket_activities')
@Index(['ticketId', 'createdAt'])
export class TicketActivity {
  @ApiProperty({ format: 'uuid' }) @PrimaryGeneratedColumn('uuid') id: string;
  @ApiProperty({ format: 'uuid' }) @Column({ type: 'uuid' }) ticketId: string;
  @ApiProperty({ type: String, nullable: true })
  @Column({ type: 'uuid', nullable: true })
  actorId: string | null;
  @ApiProperty({ example: 'STATUS_CHANGED' })
  @Column({ type: 'varchar' })
  action: string;
  @ApiProperty({ type: 'object', additionalProperties: true })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;
  @ApiProperty() @Column({ type: 'boolean', default: false }) internal: boolean;
  @ApiProperty() @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
