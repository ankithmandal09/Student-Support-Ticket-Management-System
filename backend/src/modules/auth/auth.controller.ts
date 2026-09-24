import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { NoFilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../../common/api.js';
import { Role } from '../../common/enums.js';
import { CurrentUser, Public } from '../../common/security.js';
import { User } from '../../entities/users.entity.js';
import { AuthResponse, LoginDto, RegisterDto } from './auth.dto.js';
import { AuthService } from './auth.service.js';
import { CreateUserDto } from '../users/users.dto.js';
import { UsersService } from '../users/users.service.js';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(UsersService) private readonly users: UsersService,
  ) {}
  @Public()
  @Post('register')
  @ApiEndpoint('Register a student account', AuthResponse, 201)
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }
  @Public()
  @Post('users')
  @UseInterceptors(NoFilesInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'email', 'password', 'role'],
      properties: {
        name: { type: 'string', minLength: 2, maxLength: 100 },
        email: { type: 'string', format: 'email', maxLength: 254 },
        password: {
          type: 'string',
          format: 'password',
          minLength: 8,
          maxLength: 128,
        },
        role: { type: 'string', enum: Object.values(Role) },
        department: {
          type: 'string',
          minLength: 2,
          maxLength: 100,
          description: 'Department label selected by the client',
        },
      },
    },
  })
  @ApiEndpoint('Create a student, staff or admin account (admin)', User, 201)
  createUser(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }
  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiEndpoint('Log in', AuthResponse)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }
  @Get('me')
  @ApiBearerAuth()
  @ApiEndpoint('Get the current active user', User)
  me(@CurrentUser() user: User) {
    return user;
  }
}
