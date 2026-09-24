import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
@Entity('ticket_comments')
@Index(['ticketId', 'createdAt'])
export class TicketComment {
  @ApiProperty({ format: 'uuid' }) @PrimaryGeneratedColumn('uuid') id: string;
  @ApiProperty({ format: 'uuid' }) @Column({ type: 'uuid' }) ticketId: string;
  @ApiProperty({ format: 'uuid' }) @Column({ type: 'uuid' }) userId: string;
  @ApiProperty() @Column({ type: 'text' }) message: string;
  @ApiProperty() @Column({ type: 'boolean', default: false }) internal: boolean;
  @ApiProperty() @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
