import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsString, IsUUID, Length } from 'class-validator';
import { Optional, PageQuery, Trim } from '../../common/dto.js';
import { Category, Priority, SlaState, Status } from '../../common/enums.js';
import { Ticket } from '../../entities/ticket.entity.js';
import { TicketComment } from '../../entities/ticket-comments.entity.js';
import { TicketActivity } from '../../entities/ticket-activities.entity.js';

export class CreateTicketDto {
  @ApiProperty({ enum: Category, example: Category.CERTIFICATES })
  @IsEnum(Category)
  category: Category;
  @ApiProperty({
    example: 'Request for bonafide certificate',
    minLength: 3,
    maxLength: 200,
  })
  @Trim()
  @IsString()
  @Length(3, 200)
  subject: string;
  @ApiProperty({
    example: 'I need a bonafide certificate for my scholarship application.',
    minLength: 10,
    maxLength: 10000,
  })
  @Trim()
  @IsString()
  @Length(10, 10000)
  description: string;
  @ApiPropertyOptional({ enum: Priority, default: Priority.MEDIUM })
  @Optional()
  @IsEnum(Priority)
  priority: Priority = Priority.MEDIUM;
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Staff/admin must supply an active student ID; students may omit or supply their own ID.',
  })
  @Optional()
  @IsUUID()
  studentId?: string;
}
export class TicketQuery extends PageQuery {
  @ApiPropertyOptional({ enum: Status })
  @Optional()
  @IsEnum(Status)
  status?: Status;
  @ApiPropertyOptional({ enum: Priority })
  @Optional()
  @IsEnum(Priority)
  priority?: Priority;
  @ApiPropertyOptional({ enum: Category })
  @Optional()
  @IsEnum(Category)
  category?: Category;
  @ApiPropertyOptional({ format: 'uuid' })
  @Optional()
  @IsUUID()
  assignedTo?: string;
  @ApiPropertyOptional({
    description: 'Case-insensitive literal search in subject and ticket number',
    maxLength: 100,
  })
  @Optional()
  @Trim()
  @IsString()
  @Length(1, 100)
  search?: string;
}
export class AssignDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'Active STAFF or ADMIN user. Staff may claim unassigned tickets or transfer tickets they own.',
  })
  @IsUUID()
  assignedTo: string;
  @ApiProperty({ example: 'Administration', minLength: 2, maxLength: 100 })
  @Trim()
  @IsString()
  @Length(2, 100)
  assignedTeam: string;
}
export class PriorityDto {
  @ApiProperty({
    enum: Priority,
    description:
      'Recalculates deadlines from the current cycle start, preserving elapsed time and pauses.',
  })
  @IsEnum(Priority)
  priority: Priority;
}
export class StatusDto {
  @ApiProperty({
    enum: [Status.IN_PROGRESS, Status.PENDING_STUDENT, Status.PENDING_INTERNAL],
    description:
      'Only these work states are accepted. Use dedicated resolve, close, reopen and cancel endpoints.',
  })
  @IsEnum(Status)
  status: Status;
  @ApiPropertyOptional({
    description: 'Required for both pending states. Visible to the student.',
    minLength: 3,
    maxLength: 2000,
  })
  @Optional()
  @Trim()
  @IsString()
  @Length(3, 2000)
  reason?: string;
}
export class ResolveDto {
  @ApiProperty({
    example: 'Certificate issued and ready for collection.',
    minLength: 3,
    maxLength: 5000,
  })
  @Trim()
  @IsString()
  @Length(3, 5000)
  resolutionNote: string;
  @ApiProperty({ example: 'Request fulfilled', minLength: 2, maxLength: 100 })
  @Trim()
  @IsString()
  @Length(2, 100)
  resolutionCategory: string;
}
export class CommentDto {
  @ApiProperty({
    example: 'My student ID has now been verified.',
    minLength: 1,
    maxLength: 5000,
  })
  @Trim()
  @IsString()
  @Length(1, 5000)
  message: string;
  @ApiPropertyOptional({
    default: false,
    description:
      'Staff/admin only; hidden from students and does not count as a first response.',
  })
  @Optional()
  @IsBoolean()
  internal = false;
}
export class SlaView {
  @ApiProperty({ enum: SlaState }) response: SlaState;
  @ApiProperty({ enum: SlaState }) resolution: SlaState;
  @ApiProperty({
    type: Date,
    description: 'Deadline including the current unfinished student pause.',
  })
  effectiveResolutionDueAt: Date;
}
export class TicketResponse extends Ticket {
  @ApiProperty({ type: () => SlaView }) sla: SlaView;
}
export class TicketPage {
  @ApiProperty({ type: [TicketResponse] }) items: TicketResponse[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
export class CommentPage {
  @ApiProperty({ type: [TicketComment] }) items: TicketComment[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
export class ActivityPage {
  @ApiProperty({ type: [TicketActivity] }) items: TicketActivity[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
