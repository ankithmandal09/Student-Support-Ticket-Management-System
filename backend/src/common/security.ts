import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import type { Request } from 'express';
import { User } from '../entities/users.entity.js';
import { Role } from './enums.js';

export const Public = () => SetMetadata('public', true);
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
export type AuthRequest = Request & { user: User };
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User =>
    ctx.switchToHttp().getRequest<AuthRequest>().user,
);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(DataSource) private readonly db: DataSource,
  ) {}
  async canActivate(ctx: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>('public', [
        ctx.getHandler(),
        ctx.getClass(),
      ])
    )
      return true;
    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    const match = /^Bearer ([^ ]+)$/i.exec(req.headers.authorization ?? '');
    if (!match) throw new UnauthorizedException('Bearer token required');
    let sub: string;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(match[1]);
      if (
        typeof payload.sub !== 'string' ||
        !/^[0-9a-f-]{36}$/i.test(payload.sub)
      )
        throw new Error('Invalid subject');
      sub = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    const user = await this.db
      .getRepository(User)
      .findOneBy({ id: sub, isActive: true });
    if (!user) throw new UnauthorizedException('Account unavailable');
    req.user = user;
    const roles = this.reflector.getAllAndOverride<Role[]>('roles', [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (roles && !roles.includes(user.role))
      throw new ForbiddenException('Insufficient role');
    return true;
  }
}
