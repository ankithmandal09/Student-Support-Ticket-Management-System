import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../../common/api.js';
import { Priority, Role } from '../../common/enums.js';
import { Roles } from '../../common/security.js';
import { SlaPolicy } from '../../entities/sla.entity.js';
import { SweepResult, UpdateSlaDto } from './sla.dto.js';
import { SlaService } from './sla.service.js';
@ApiTags('SLA')
@ApiBearerAuth()
@Controller('sla')
export class SlaController {
  constructor(@Inject(SlaService) private readonly sla: SlaService) {}
  @Get('policies')
  @ApiEndpoint('List SLA policies in calendar minutes', SlaPolicy, 200, true)
  list() {
    return this.sla.list();
  }
  @Patch('policies/:priority')
  @Roles(Role.ADMIN)
  @ApiParam({ name: 'priority', enum: Priority })
  @ApiEndpoint('Update a priority SLA policy (admin)', SlaPolicy)
  update(
    @Param('priority', new ParseEnumPipe(Priority)) priority: Priority,
    @Body() dto: UpdateSlaDto,
  ) {
    return this.sla.update(priority, dto);
  }
  @Post('escalations/run')
  @Roles(Role.ADMIN)
  @HttpCode(200)
  @ApiEndpoint('Run the idempotent escalation sweep now (admin)', SweepResult)
  sweep() {
    return this.sla.sweep();
  }
}
