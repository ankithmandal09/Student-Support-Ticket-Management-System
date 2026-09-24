import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Role } from '../common/enums.js';
@Entity('users')
export class User {
  @ApiProperty({ format: 'uuid' }) @PrimaryGeneratedColumn('uuid') id: string;
  @ApiProperty({ example: 'Ankith' })
  @Column({ type: 'varchar', length: 100 })
  name: string;
  @ApiProperty({ example: 'student@example.com' })
  @Column({ type: 'varchar', length: 254, unique: true })
  email: string;
  @ApiHideProperty()
  @Column({ type: 'varchar', select: false })
  passwordHash: string;
  @ApiProperty({ enum: Role })
  @Column({ type: 'varchar', default: Role.STUDENT })
  role: Role;
  @ApiProperty({ nullable: true, type: String })
  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string | null;
  @ApiProperty() @Column({ type: 'boolean', default: true }) isActive: boolean;
  @ApiProperty() @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @ApiProperty() @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}
