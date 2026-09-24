import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../../entities/users.entity.js';
import { Ticket } from '../../entities/ticket.entity.js';
import { Role, terminalStatuses } from '../../common/enums.js';
import { PageQuery } from '../../common/dto.js';
import { hashPassword } from '../../common/password.js';
import { CreateUserDto } from './users.dto.js';
@Injectable()
export class UsersService {
  constructor(@Inject(DataSource) private readonly db: DataSource) {}
  async list(q: PageQuery) {
    const [items, total] = await this.db
      .getRepository(User)
      .findAndCount({
        order: { createdAt: 'DESC', id: 'DESC' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      });
    return { items, total, page: q.page, limit: q.limit };
  }
  async create(dto: CreateUserDto) {
    const repo = this.db.getRepository(User);
    const user = repo.create({
      name: dto.name,
      email: dto.email,
      role: dto.role,
      department: dto.department ?? null,
      passwordHash: await hashPassword(dto.password),
    });
    try {
      await repo.save(user);
    } catch (error) {
      if ((error as { code?: string }).code === '23505')
        throw new ConflictException('Email already registered');
      throw error;
    }
    return repo.findOneByOrFail({ id: user.id });
  }
  async setActive(id: string, isActive: boolean, actor: User) {
    if (id === actor.id && !isActive)
      throw new ConflictException('You cannot deactivate your own account');
    return this.db.transaction(async (em) => {
      // Serialize account status changes so concurrent admin deactivations cannot
      // remove the final active administrator.
      await em.query('SELECT pg_advisory_xact_lock(9118500)');
      // All assignment paths acquire this same user lock before locking tickets.
      const user = await em.findOne(User, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('User not found');
      if (
        !isActive &&
        user.role === Role.ADMIN &&
        user.isActive &&
        (await em.countBy(User, { role: Role.ADMIN, isActive: true })) <= 1
      )
        throw new ConflictException(
          'Cannot deactivate the last active administrator',
        );
      if (!isActive && user.role !== Role.STUDENT) {
        const count = await em
          .getRepository(Ticket)
          .createQueryBuilder('t')
          .where('t.assignedTo = :id', { id })
          .andWhere('t.status NOT IN (:...terminal)', {
            terminal: terminalStatuses,
          })
          .getCount();
        if (count)
          throw new ConflictException(
            'Transfer all active tickets before deactivating this user',
          );
      }
      user.isActive = isActive;
      return em.save(user);
    });
  }
}
