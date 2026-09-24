import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Category, Priority, Source, Status } from '../common/enums.js';
@Entity('tickets')
@Index(['studentId', 'createdAt'])
@Index(['status', 'resolutionDueAt'])
export class Ticket {
  @ApiProperty({ format: 'uuid' }) @PrimaryGeneratedColumn('uuid') id: string;
  @ApiProperty({ example: 'TKT-36D664E4-AFAD-4112-8060-8513682A3811' })
  @Column({ type: 'varchar', unique: true })
  ticketNumber: string;
  @ApiProperty({ format: 'uuid' }) @Column({ type: 'uuid' }) studentId: string;
  @ApiProperty({ enum: Category })
  @Column({ type: 'varchar' })
  category: Category;
  @ApiProperty() @Column({ type: 'varchar', length: 200 }) subject: string;
  @ApiProperty() @Column({ type: 'text' }) description: string;
  @ApiProperty({ enum: Priority })
  @Column({ type: 'varchar' })
  priority: Priority;
  @ApiProperty({ enum: Status })
  @Column({ type: 'varchar', default: Status.NEW })
  status: Status;
  @ApiProperty({ enum: Source }) @Column({ type: 'varchar' }) source: Source;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' })
  @Column({ type: 'uuid', nullable: true })
  assignedTo: string | null;
  @ApiProperty({ type: String, nullable: true })
  @Column({ type: 'varchar', length: 100, nullable: true })
  assignedTeam: string | null;
  @ApiProperty({ type: String, nullable: true })
  @Column({ type: 'text', nullable: true })
  pendingReason: string | null;
  @ApiProperty() @Column({ type: 'timestamptz' }) responseDueAt: Date;
  @ApiProperty() @Column({ type: 'timestamptz' }) resolutionDueAt: Date;
  @ApiProperty() @Column({ type: 'integer' }) responseMinutes: number;
  @ApiProperty() @Column({ type: 'integer' }) resolutionMinutes: number;
  @ApiProperty({ type: Date, nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  firstResponseAt: Date | null;
  @ApiProperty({ type: Date, nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  pausedAt: Date | null;
  @ApiProperty()
  @Column({ type: 'double precision', default: 0 })
  pausedMilliseconds: number;
  @ApiProperty({ type: Date, nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;
  @ApiProperty({ type: String, nullable: true })
  @Column({ type: 'uuid', nullable: true })
  resolvedBy: string | null;
  @ApiProperty({ type: String, nullable: true })
  @Column({ type: 'text', nullable: true })
  resolutionNote: string | null;
  @ApiProperty({ type: String, nullable: true })
  @Column({ type: 'varchar', length: 100, nullable: true })
  resolutionCategory: string | null;
  @ApiProperty({ type: Date, nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  closedAt: Date | null;
  @ApiProperty({ type: Date, nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  reopenedAt: Date | null;
  @ApiProperty({ type: String, nullable: true })
  @Column({ type: 'uuid', nullable: true })
  reopenedBy: string | null;
  @ApiProperty({ type: String, nullable: true })
  @Column({ type: 'text', nullable: true })
  reopenReason: string | null;
  @ApiProperty({
    description:
      '0 = none, 1 = at risk, 2 = breached; highest level reached in current cycle',
  })
  @Column({ type: 'integer', default: 0 })
  escalationLevel: number;
  @ApiProperty() @Column({ type: 'integer', default: 0 }) reopenCount: number;
  @ApiProperty() @VersionColumn() version: number;
  @ApiProperty() @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @ApiProperty() @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}
