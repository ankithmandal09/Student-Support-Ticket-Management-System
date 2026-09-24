import 'dotenv/config';
import type { DataSourceOptions } from 'typeorm';
import { User } from '../entities/users.entity.js';
import { Ticket } from '../entities/ticket.entity.js';
import { TicketActivity } from '../entities/ticket-activities.entity.js';
import { TicketComment } from '../entities/ticket-comments.entity.js';
import { SlaPolicy } from '../entities/sla.entity.js';
import { Initial1790200000000 } from './migrations/1790200000000-initial.js';
export function databaseOptions(): DataSourceOptions {
  const schema = process.env.DB_SCHEMA ?? 'public';
  if (!/^[a-z][a-z0-9_]*$/.test(schema))
    throw new Error('DB_SCHEMA must be a lowercase SQL identifier');
  const port = Number(process.env.DB_PORT);
  return {
    type: 'postgres',
    host: process.env.DB_HOST,
    port,
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    schema,
    extra: { options: `-c search_path=${schema},public` },
    entities: [User, Ticket, TicketActivity, TicketComment, SlaPolicy],
    migrations: [Initial1790200000000],
    synchronize: false,
    migrationsRun: true,
  };
}
