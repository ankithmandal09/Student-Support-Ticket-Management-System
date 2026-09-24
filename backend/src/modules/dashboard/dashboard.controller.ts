import { Controller, Get, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../../common/api.js';
import { Role } from '../../common/enums.js';
import { Roles } from '../../common/security.js';
import { DashboardResponse } from './dashboard.dto.js';
import { DashboardService } from './dashboard.service.js';
@ApiTags('Dashboard')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.STAFF)
@Controller('dashboard')
export class DashboardController {
  constructor(
    @Inject(DashboardService) private readonly dashboard: DashboardService,
  ) {}
  @Get()
  @ApiEndpoint(
    'Get ticket counts, active SLA breaches and staff workload (staff/admin)',
    DashboardResponse,
  )
  summary() {
    return this.dashboard.summary();
  }
}
