import dataSource from './data-source.js';
import { User } from '../entities/users.entity.js';
import { Role } from '../common/enums.js';
import { hashPassword } from '../common/password.js';
async function seed() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    !password ||
    password.length < 10 ||
    password.length > 128
  )
    throw new Error(
      'Set a valid ADMIN_EMAIL and ADMIN_PASSWORD (10–128 characters)',
    );
  await dataSource.initialize();
  try {
    const repo = dataSource.getRepository(User);
    const existing = await repo.findOneBy({ email });
    if (existing) {
      if (existing.role !== Role.ADMIN)
        throw new Error('Email already belongs to a non-admin user');
      console.log('Admin already exists; credentials unchanged');
      return;
    }
    await repo.save(
      repo.create({
        name: 'Administrator',
        email,
        passwordHash: await hashPassword(password),
        role: Role.ADMIN,
        department: 'Administration',
      }),
    );
    console.log('Admin account created');
  } finally {
    await dataSource.destroy();
  }
}
seed().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Seed failed');
  process.exitCode = 1;
});
