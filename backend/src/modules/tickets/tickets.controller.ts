import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../../common/api.js';
import { PageQuery, ReasonDto } from '../../common/dto.js';
import { Role } from '../../common/enums.js';
import { CurrentUser, Roles } from '../../common/security.js';
import { User } from '../../entities/users.entity.js';
import { TicketComment } from '../../entities/ticket-comments.entity.js';
import {
  ActivityPage,
  AssignDto,
  CommentDto,
  CommentPage,
  CreateTicketDto,
  PriorityDto,
  ResolveDto,
  StatusDto,
  TicketPage,
  TicketQuery,
  TicketResponse,
} from './tickets.dto.js';
import { TicketsService } from './tickets.service.js';

@ApiTags('Tickets')
@ApiBearerAuth()
@Controller('tickets')
export class TicketsController {
  constructor(
    @Inject(TicketsService) private readonly tickets: TicketsService,
  ) {}
  @Post()
  @ApiEndpoint('Create a ticket with SLA deadlines', TicketResponse, 201)
  create(@Body() dto: CreateTicketDto, @CurrentUser() actor: User) {
    return this.tickets.create(dto, actor);
  }
  @Get()
  @ApiEndpoint('Search/filter tickets; students see only their own', TicketPage)
  list(@Query() q: TicketQuery, @CurrentUser() actor: User) {
    return this.tickets.list(q, actor);
  }
  @Get(':id')
  @ApiEndpoint('Get ticket details and live SLA state', TicketResponse)
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: User) {
    return this.tickets.get(id, actor);
  }
  @Patch(':id/assignment')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiEndpoint('Assign, claim or transfer an active ticket', TicketResponse)
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDto,
    @CurrentUser() actor: User,
  ) {
    return this.tickets.assign(id, dto, actor);
  }
  @Patch(':id/priority')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiEndpoint(
    'Change priority and recalculate SLA deadlines (owner/admin)',
    TicketResponse,
  )
  priority(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PriorityDto,
    @CurrentUser() actor: User,
  ) {
    return this.tickets.priority(id, dto.priority, actor);
  }
  @Patch(':id/status')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiEndpoint(
    'Start work or set/resume a pending state (owner/admin)',
    TicketResponse,
  )
  status(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StatusDto,
    @CurrentUser() actor: User,
  ) {
    return this.tickets.status(id, dto, actor);
  }
  @Patch(':id/resolve')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiEndpoint(
    'Resolve an IN_PROGRESS ticket with resolution details (owner/admin)',
    TicketResponse,
  )
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveDto,
    @CurrentUser() actor: User,
  ) {
    return this.tickets.resolve(id, dto, actor);
  }
  @Patch(':id/close')
  @ApiEndpoint('Close a RESOLVED ticket (student/owner/admin)', TicketResponse)
  close(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: User) {
    return this.tickets.close(id, actor);
  }
  @Patch(':id/reopen')
  @ApiEndpoint(
    'Reopen a RESOLVED/CLOSED ticket with a fresh SLA cycle',
    TicketResponse,
  )
  reopen(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
    @CurrentUser() actor: User,
  ) {
    return this.tickets.reopen(id, dto.reason, actor);
  }
  @Patch(':id/cancel')
  @ApiEndpoint(
    'Cancel a NEW/ASSIGNED/IN_PROGRESS ticket with a reason',
    TicketResponse,
  )
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
    @CurrentUser() actor: User,
  ) {
    return this.tickets.cancel(id, dto.reason, actor);
  }
  @Post(':id/comments')
  @ApiEndpoint(
    'Add a reply or internal note; student reply resumes a pending ticket',
    TicketComment,
    201,
  )
  comment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CommentDto,
    @CurrentUser() actor: User,
  ) {
    return this.tickets.comment(id, dto, actor);
  }
  @Get(':id/comments')
  @ApiEndpoint(
    'Read comments; internal notes are hidden from students',
    CommentPage,
  )
  comments(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: PageQuery,
    @CurrentUser() actor: User,
  ) {
    return this.tickets.comments(id, q, actor);
  }
  @Get(':id/activities')
  @ApiEndpoint(
    'Read immutable ticket history; internal events are hidden from students',
    ActivityPage,
  )
  activities(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: PageQuery,
    @CurrentUser() actor: User,
  ) {
    return this.tickets.activities(id, q, actor);
  }
}
