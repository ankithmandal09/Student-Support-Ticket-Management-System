import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { User } from '../../entities/users.entity.js';
import { Role } from '../../common/enums.js';
import { checkPassword, hashPassword } from '../../common/password.js';
import { LoginDto, RegisterDto } from './auth.dto.js';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DataSource) private readonly db: DataSource,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}
  async register(dto: RegisterDto) {
    const repo = this.db.getRepository(User);
    const user = repo.create({
      name: dto.name,
      email: dto.email,
      passwordHash: await hashPassword(dto.password),
      role: Role.STUDENT,
      department: null,
    });
    try {
      await repo.save(user);
    } catch (error) {
      if ((error as { code?: string }).code === '23505')
        throw new ConflictException('Email already registered');
      throw error;
    }
    return this.token(user);
  }

  async login(dto: LoginDto) {
    const user = await this.db
      .getRepository(User)
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: dto.email })
      .getOne();
    // Perform the expensive hash even for unknown accounts.
    const valid = await checkPassword(
      dto.password,
      user?.passwordHash ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`,
    );
    if (!user?.isActive || !valid)
      throw new UnauthorizedException('Invalid email or password');
    return this.token(user);
  }
  
  private async token(user: User) {
    const { passwordHash: _passwordHash, ...safe } = user;
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id }),
      tokenType: 'Bearer',
      expiresIn: 86400,
      user: safe,
    };
  }
}
