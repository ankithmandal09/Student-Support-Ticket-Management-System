import 'dotenv/config';
import pg from 'pg';
const client = new pg.Client({ host: process.env.DB_HOST ?? 'localhost', port: Number(process.env.DB_PORT ?? 5432), user: process.env.DB_USERNAME ?? 'postgres', password: process.env.DB_PASSWORD, database: process.env.DB_NAME ?? 'student_support', connectionTimeoutMillis: 5000 });
try {
  await client.connect();
  await client.query('SELECT 1');
  console.log('PostgreSQL connection successful');
} catch (error) {
  console.error('PostgreSQL check failed:', error.code, error.message);
  process.exitCode = 1;
} finally { await client.end(); }
