import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../../common/api.js';
import { PageQuery } from '../../common/dto.js';
import { Role } from '../../common/enums.js';
import { CurrentUser, Roles } from '../../common/security.js';
import { User } from '../../entities/users.entity.js';
import { ActiveDto, UserPage } from './users.dto.js';
import { UsersService } from './users.service.js';
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}
  @Get()
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiEndpoint('List users (staff/admin)', UserPage)
  list(@Query() q: PageQuery) {
    return this.users.list(q);
  }
  @Patch(':id/active')
  @Roles(Role.ADMIN)
  @ApiEndpoint('Activate/deactivate a user (admin)', User)
  active(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActiveDto,
    @CurrentUser() user: User,
  ) {
    return this.users.setActive(id, dto.isActive, user);
  }
}
