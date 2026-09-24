import 'reflect-metadata';
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { databaseOptions } from '../dist/database/config.js';
import { User } from '../dist/entities/users.entity.js';
import { Role } from '../dist/common/enums.js';
import { hashPassword } from '../dist/common/password.js';
import { configureApp, createSwagger } from '../dist/setup.js';
import { AppModule } from '../dist/app.module.js';

describe('Student support API (isolated PostgreSQL schema)', () => {
  let app: INestApplication<App>;
  let db: DataSource;
  let admin: string,
    staff: string,
    staffId: string,
    otherStaff: string,
    otherStaffId: string;
  let student: string, studentId: string, otherStudent: string;
  let ticketId: string;
  const schema = `test_support_${randomUUID().replaceAll('-', '')}`;
  const password = 'TestPassword123!';
  const newTicket = {
    category: 'CERTIFICATES',
    subject: 'Need a certificate',
    description: 'Please issue a bonafide certificate for my scholarship.',
  };
  const token = (value: string) => ({ Authorization: `Bearer ${value}` });
  const api = () => request(app.getHttpServer());
  async function createTicket() {
    return (
      await api()
        .post('/api/tickets')
        .set(token(student))
        .send(newTicket)
        .expect(201)
    ).body.id as string;
  }
  async function assign(id: string) {
    return api()
      .patch(`/api/tickets/${id}/assignment`)
      .set(token(admin))
      .send({ assignedTo: staffId, assignedTeam: 'Administration' })
      .expect(200);
  }
  async function start(id: string) {
    return api()
      .patch(`/api/tickets/${id}/status`)
      .set(token(staff))
      .send({ status: 'IN_PROGRESS' })
      .expect(200);
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = randomUUID() + randomUUID();
    process.env.SLA_SCHEDULER_ENABLED = 'false';
    const bootstrap = new DataSource(databaseOptions());
    await bootstrap.initialize();
    try {
      await bootstrap.query(`CREATE SCHEMA "${schema}"`);
    } finally {
      await bootstrap.destroy();
    }
    process.env.DB_SCHEMA = schema;
    db = new DataSource(databaseOptions());
    await db.initialize();
    await db.runMigrations();
    await db
      .getRepository(User)
      .save({
        name: 'Admin',
        email: 'admin@test.example',
        passwordHash: await hashPassword(password),
        role: Role.ADMIN,
      });
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    admin = (
      await api()
        .post('/api/auth/login')
        .send({ email: 'admin@test.example', password })
        .expect(200)
    ).body.accessToken;
    for (const [email, name] of [
      ['staff@test.example', 'Staff'],
      ['otherstaff@test.example', 'Other Staff'],
    ]) {
      const user = (
        await api()
          .post('/api/users')
          .set(token(admin))
          .send({
            name,
            email,
            password,
            role: 'STAFF',
            department: 'Administration',
          })
          .expect(201)
      ).body;
      const login = (
        await api()
          .post('/api/auth/login')
          .send({ email, password })
          .expect(200)
      ).body;
      if (name === 'Staff') {
        staff = login.accessToken;
        staffId = user.id;
      } else {
        otherStaff = login.accessToken;
        otherStaffId = user.id;
      }
    }
    const registration = await api()
      .post('/api/auth/register')
      .send({ name: 'Student', email: 'student@test.example', password })
      .expect(201);
    student = registration.body.accessToken;
    studentId = registration.body.user.id;
    otherStudent = (
      await api()
        .post('/api/auth/register')
        .send({ name: 'Other Student', email: 'other@test.example', password })
        .expect(201)
    ).body.accessToken;
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
    if (db?.isInitialized) {
      // Only the random schema created by this suite is ever removed.
      if (!/^test_support_[a-f0-9]{32}$/.test(schema))
        throw new Error('Unsafe test schema');
      await db.query(`DROP SCHEMA "${schema}" CASCADE`);
      await db.destroy();
    }
  }, 30000);

  it('serves public health and rejects missing/invalid tokens', async () => {
    await api()
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok', service: 'student-support-api' });
    await api().get('/api/tickets').expect(401);
    await api().get('/api/tickets').set(token('invalid')).expect(401);
  });
  it('normalizes email, rejects duplicates and never exposes password hashes', async () => {
    const result = await api()
      .post('/api/auth/login')
      .send({ email: ' STUDENT@TEST.EXAMPLE ', password })
      .expect(200);
    expect(result.body.user.passwordHash).toBeUndefined();
    await api()
      .post('/api/auth/login')
      .send({ email: 'student@test.example', password: 'WrongPassword123' })
      .expect(401);
    await api()
      .post('/api/auth/register')
      .send({ name: 'Student', email: 'STUDENT@TEST.EXAMPLE', password })
      .expect(409);
    await api()
      .post('/api/auth/register')
      .send({
        name: 'Student',
        email: 'new@test.example',
        password,
        role: 'ADMIN',
      })
      .expect(400);
    const users = await api().get('/api/users').set(token(admin)).expect(200);
    expect(JSON.stringify(users.body)).not.toContain('passwordHash');
  });
  it('enforces roles and strict request validation', async () => {
    await api().post('/api/users').set(token(student)).send({}).expect(403);
    await api().get('/api/dashboard').set(token(student)).expect(403);
    await api()
      .post('/api/tickets')
      .set(token(student))
      .send({ ...newTicket, subject: '   ' })
      .expect(400);
    await api()
      .post('/api/tickets')
      .set(token(student))
      .send({ ...newTicket, priority: null })
      .expect(400);
    await api()
      .post('/api/tickets')
      .set(token(student))
      .send({ ...newTicket, status: 'CLOSED' })
      .expect(400);
    await api()
      .get('/api/tickets?page=0&limit=101')
      .set(token(student))
      .expect(400);
    await api().get('/api/tickets/not-a-uuid').set(token(student)).expect(400);
    await api()
      .get('/api/tickets?status=INVALID')
      .set(token(student))
      .expect(400);
    await api()
      .post('/api/tickets')
      .set(token(staff))
      .send(newTicket)
      .expect(400);
  });
  it('creates tickets with SLA snapshots and protects student ownership', async () => {
    const created = await api()
      .post('/api/tickets')
      .set(token(student))
      .send(newTicket)
      .expect(201);
    ticketId = created.body.id;
    expect(created.body).toMatchObject({
      status: 'NEW',
      priority: 'MEDIUM',
      source: 'STUDENT_PORTAL',
      studentId,
      responseMinutes: 240,
      resolutionMinutes: 1440,
    });
    expect(created.body.sla.response).toBe('ON_TRACK');
    await api()
      .get(`/api/tickets/${ticketId}`)
      .set(token(otherStudent))
      .expect(404);
    await api()
      .post(`/api/tickets/${ticketId}/comments`)
      .set(token(otherStudent))
      .send({ message: 'Unauthorized reply' })
      .expect(404);
    await api()
      .post('/api/tickets')
      .set(token(otherStudent))
      .send({ ...newTicket, studentId })
      .expect(403);
    expect(
      (await api().get('/api/tickets').set(token(otherStudent)).expect(200))
        .body.total,
    ).toBe(0);
  });
  it('validates assignments and requires ownership for work', async () => {
    await api()
      .patch(`/api/tickets/${ticketId}/assignment`)
      .set(token(admin))
      .send({ assignedTo: studentId, assignedTeam: 'Administration' })
      .expect(400);
    await assign(ticketId);
    await api()
      .patch(`/api/tickets/${ticketId}/status`)
      .set(token(otherStaff))
      .send({ status: 'IN_PROGRESS' })
      .expect(403);
    await api()
      .patch(`/api/tickets/${ticketId}/status`)
      .set(token(staff))
      .send({ status: 'CLOSED' })
      .expect(400);
    await start(ticketId);
    await api()
      .patch(`/api/tickets/${ticketId}/resolve`)
      .set(token(staff))
      .send({ resolutionNote: ' ', resolutionCategory: 'Done' })
      .expect(400);
  });
  it('hides internal notes and counts only public staff replies as first response', async () => {
    await api()
      .post(`/api/tickets/${ticketId}/comments`)
      .set(token(staff))
      .send({ message: 'Private staff note', internal: true })
      .expect(201);
    const before = (
      await api()
        .get(`/api/tickets/${ticketId}`)
        .set(token(student))
        .expect(200)
    ).body;
    expect(before.firstResponseAt).toBeNull();
    expect(
      (
        await api()
          .get(`/api/tickets/${ticketId}/comments`)
          .set(token(student))
          .expect(200)
      ).body.total,
    ).toBe(0);
    const history = (
      await api()
        .get(`/api/tickets/${ticketId}/activities`)
        .set(token(student))
        .expect(200)
    ).body;
    expect(
      history.items.some((item: { internal: boolean }) => item.internal),
    ).toBe(false);
    await api()
      .post(`/api/tickets/${ticketId}/comments`)
      .set(token(student))
      .send({ message: 'Private?', internal: true })
      .expect(403);
    await api()
      .post(`/api/tickets/${ticketId}/comments`)
      .set(token(staff))
      .send({ message: 'We are processing your request.' })
      .expect(201);
    expect(
      (
        await api()
          .get(`/api/tickets/${ticketId}`)
          .set(token(student))
          .expect(200)
      ).body.firstResponseAt,
    ).not.toBeNull();
  });
  it('requires pending reasons and resumes on a student reply', async () => {
    await api()
      .patch(`/api/tickets/${ticketId}/status`)
      .set(token(staff))
      .send({ status: 'PENDING_STUDENT' })
      .expect(400);
    const pending = (
      await api()
        .patch(`/api/tickets/${ticketId}/status`)
        .set(token(staff))
        .send({ status: 'PENDING_STUDENT', reason: 'Please verify your ID.' })
        .expect(200)
    ).body;
    expect(pending.sla.resolution).toBe('PAUSED');
    await api()
      .post(`/api/tickets/${ticketId}/comments`)
      .set(token(student))
      .send({ message: 'My ID is verified.' })
      .expect(201);
    const resumed = (
      await api()
        .get(`/api/tickets/${ticketId}`)
        .set(token(student))
        .expect(200)
    ).body;
    expect(resumed.status).toBe('IN_PROGRESS');
    expect(resumed.pendingReason).toBeNull();
    expect(resumed.pausedAt).toBeNull();
    expect(new Date(resumed.resolutionDueAt).getTime()).toBeGreaterThanOrEqual(
      new Date(pending.resolutionDueAt).getTime(),
    );
  });
  it('resolves once under concurrent requests, closes and reopens with historical resolution', async () => {
    const results = await Promise.all(
      [1, 2].map(() =>
        api()
          .patch(`/api/tickets/${ticketId}/resolve`)
          .set(token(staff))
          .send({
            resolutionNote: 'Certificate issued.',
            resolutionCategory: 'Fulfilled',
          }),
      ),
    );
    expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      200, 400,
    ]);
    await api()
      .post(`/api/tickets/${ticketId}/comments`)
      .set(token(student))
      .send({ message: 'Reply to terminal ticket' })
      .expect(400);
    await api()
      .patch(`/api/tickets/${ticketId}/close`)
      .set(token(student))
      .expect(200);
    const reopened = (
      await api()
        .patch(`/api/tickets/${ticketId}/reopen`)
        .set(token(student))
        .send({ reason: 'The name is still incorrect.' })
        .expect(200)
    ).body;
    expect(reopened).toMatchObject({
      status: 'REOPENED',
      reopenCount: 1,
      resolvedAt: null,
      resolutionNote: null,
      firstResponseAt: null,
    });
    const history = (
      await api()
        .get(`/api/tickets/${ticketId}/activities`)
        .set(token(student))
        .expect(200)
    ).body.items;
    expect(
      history.find((a: { action: string }) => a.action === 'REOPENED').metadata
        .previousResolution.resolutionNote,
    ).toBe('Certificate issued.');
    await start(ticketId);
  });
  it('recalculates priority without resetting elapsed time', async () => {
    const before = (
      await api().get(`/api/tickets/${ticketId}`).set(token(staff)).expect(200)
    ).body;
    const after = (
      await api()
        .patch(`/api/tickets/${ticketId}/priority`)
        .set(token(staff))
        .send({ priority: 'HIGH' })
        .expect(200)
    ).body;
    expect(
      new Date(after.responseDueAt).getTime() -
        new Date(before.reopenedAt).getTime(),
    ).toBe(120 * 60000);
    expect(after.resolutionMinutes).toBe(480);
  });
  it('prevents deactivation with active work, permits transfer, and rejects inactive JWTs', async () => {
    await api()
      .patch(`/api/users/${staffId}/active`)
      .set(token(admin))
      .send({ isActive: false })
      .expect(409);
    await api()
      .patch(`/api/tickets/${ticketId}/assignment`)
      .set(token(staff))
      .send({ assignedTo: otherStaffId, assignedTeam: 'Administration' })
      .expect(200);
    await api()
      .patch(`/api/users/${staffId}/active`)
      .set(token(admin))
      .send({ isActive: false })
      .expect(200);
    await api().get('/api/auth/me').set(token(staff)).expect(401);
    await api()
      .patch(`/api/tickets/${ticketId}/assignment`)
      .set(token(admin))
      .send({ assignedTo: staffId, assignedTeam: 'Administration' })
      .expect(400);
    await api()
      .patch(`/api/users/${staffId}/active`)
      .set(token(admin))
      .send({ isActive: true })
      .expect(200);
  });
  it('supports pending internal without pausing and cancellation only in eligible states', async () => {
    const id = await createTicket();
    await assign(id);
    await start(id);
    const pending = (
      await api()
        .patch(`/api/tickets/${id}/status`)
        .set(token(staff))
        .send({
          status: 'PENDING_INTERNAL',
          reason: 'Waiting for finance approval.',
        })
        .expect(200)
    ).body;
    expect(pending.pausedAt).toBeNull();
    await api()
      .patch(`/api/tickets/${id}/cancel`)
      .set(token(student))
      .send({ reason: 'No longer required.' })
      .expect(400);
    await start(id);
    await api()
      .patch(`/api/tickets/${id}/cancel`)
      .set(token(student))
      .send({ reason: 'No longer required.' })
      .expect(200);
    await api()
      .patch(`/api/tickets/${id}/reopen`)
      .set(token(student))
      .send({ reason: 'Changed my mind.' })
      .expect(400);
  });
  it('records idempotent at-risk and breached escalation events', async () => {
    const id = await createTicket();
    await db.query(
      'UPDATE tickets SET "responseDueAt" = now() + interval \'40 minutes\' WHERE id = $1',
      [id],
    );
    await api().post('/api/sla/escalations/run').set(token(admin)).expect(200);
    await api().post('/api/sla/escalations/run').set(token(admin)).expect(200);
    await db.query(
      'UPDATE tickets SET "responseDueAt" = now() - interval \'1 minute\' WHERE id = $1',
      [id],
    );
    await Promise.all(
      [1, 2].map(() =>
        api().post('/api/sla/escalations/run').set(token(admin)).expect(200),
      ),
    );
    const events = await db.query(
      'SELECT action FROM ticket_activities WHERE "ticketId" = $1 AND action LIKE \'SLA_%\'',
      [id],
    );
    expect(events.map((e: { action: string }) => e.action).sort()).toEqual([
      'SLA_AT_RISK',
      'SLA_BREACHED',
    ]);
    const dashboard = (
      await api().get('/api/dashboard').set(token(admin)).expect(200)
    ).body;
    expect(dashboard.breached).toBeGreaterThanOrEqual(1);
    expect(dashboard.workload.length).toBeGreaterThan(0);
  });
  it('validates policy durations and snapshots policy changes for new tickets only', async () => {
    await api()
      .patch('/api/sla/policies/HIGH')
      .set(token(admin))
      .send({ responseMinutes: 100, resolutionMinutes: 50 })
      .expect(400);
    await api()
      .patch('/api/sla/policies/HIGH')
      .set(token(student))
      .send({ responseMinutes: 10, resolutionMinutes: 20 })
      .expect(403);
    await api()
      .patch('/api/sla/policies/HIGH')
      .set(token(admin))
      .send({ responseMinutes: 60, resolutionMinutes: 240 })
      .expect(200);
    expect(
      (
        await api()
          .get(`/api/tickets/${ticketId}`)
          .set(token(student))
          .expect(200)
      ).body.responseMinutes,
    ).toBe(120);
    const fresh = (
      await api()
        .post('/api/tickets')
        .set(token(student))
        .send({ ...newTicket, priority: 'HIGH' })
        .expect(201)
    ).body;
    expect(fresh.responseMinutes).toBe(60);
  });
  it('rolls back ticket creation if its audit write fails', async () => {
    const before = Number(
      (await db.query('SELECT count(*) AS count FROM tickets'))[0].count,
    );
    await db.query(
      `CREATE FUNCTION test_reject_created() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'CREATED' THEN RAISE EXCEPTION 'Test audit failure'; END IF; RETURN NEW; END $$`,
    );
    await db.query(
      'CREATE TRIGGER test_audit_failure BEFORE INSERT ON ticket_activities FOR EACH ROW EXECUTE FUNCTION test_reject_created()',
    );
    try {
      await api()
        .post('/api/tickets')
        .set(token(student))
        .send(newTicket)
        .expect(500);
      expect(
        Number(
          (await db.query('SELECT count(*) AS count FROM tickets'))[0].count,
        ),
      ).toBe(before);
    } finally {
      await db.query('DROP TRIGGER test_audit_failure ON ticket_activities');
      await db.query('DROP FUNCTION test_reject_created()');
    }
  });
  it('removes inactive ownership on reopening and requires reassignment before work', async () => {
    const user = (
      await api()
        .post('/api/users')
        .set(token(admin))
        .send({
          name: 'Departing Staff',
          email: 'departing@test.example',
          password,
          role: 'STAFF',
        })
        .expect(201)
    ).body;
    const id = await createTicket();
    await api()
      .patch(`/api/tickets/${id}/assignment`)
      .set(token(admin))
      .send({ assignedTo: user.id, assignedTeam: 'Administration' })
      .expect(200);
    await api()
      .patch(`/api/tickets/${id}/status`)
      .set(token(admin))
      .send({ status: 'IN_PROGRESS' })
      .expect(200);
    await api()
      .patch(`/api/tickets/${id}/resolve`)
      .set(token(admin))
      .send({
        resolutionNote: 'Request completed.',
        resolutionCategory: 'Fulfilled',
      })
      .expect(200);
    await api()
      .patch(`/api/users/${user.id}/active`)
      .set(token(admin))
      .send({ isActive: false })
      .expect(200);
    const reopened = (
      await api()
        .patch(`/api/tickets/${id}/reopen`)
        .set(token(student))
        .send({ reason: 'Issue is still present.' })
        .expect(200)
    ).body;
    expect(reopened.assignedTo).toBeNull();
    await api()
      .patch(`/api/tickets/${id}/status`)
      .set(token(admin))
      .send({ status: 'IN_PROGRESS' })
      .expect(400);
    await assign(id);
    await start(id);
  });
  it('serializes assignment against concurrent staff deactivation', async () => {
    const user = (
      await api()
        .post('/api/users')
        .set(token(admin))
        .send({
          name: 'Race Staff',
          email: 'race@test.example',
          password,
          role: 'STAFF',
        })
        .expect(201)
    ).body;
    const id = await createTicket();
    const [assignment, deactivation] = await Promise.all([
      api()
        .patch(`/api/tickets/${id}/assignment`)
        .set(token(admin))
        .send({ assignedTo: user.id, assignedTeam: 'Administration' }),
      api()
        .patch(`/api/users/${user.id}/active`)
        .set(token(admin))
        .send({ isActive: false }),
    ]);
    expect([
      [200, 409],
      [400, 200],
    ]).toContainEqual([assignment.status, deactivation.status]);
    const violations = await db.query(
      "SELECT t.id FROM tickets t JOIN users u ON t.\"assignedTo\" = u.id WHERE u.\"isActive\" = false AND t.status NOT IN ('RESOLVED','CLOSED','CANCELLED')",
    );
    expect(violations).toHaveLength(0);
  });
  it('enforces immutable audit entries in PostgreSQL', async () => {
    await expect(
      db.query(
        'UPDATE ticket_activities SET action = \'FORGED\' WHERE "ticketId" = $1',
        [ticketId],
      ),
    ).rejects.toThrow('immutable');
    await expect(
      db.query('DELETE FROM ticket_activities WHERE "ticketId" = $1', [
        ticketId,
      ]),
    ).rejects.toThrow('immutable');
  });
  it('documents every endpoint, body, response and protected operation in Swagger', () => {
    const doc = createSwagger(app);
    let operations = 0;
    for (const [path, item] of Object.entries(doc.paths)) {
      for (const method of ['get', 'post', 'patch'] as const) {
        const operation = item[method];
        if (!operation) continue;
        operations++;
        expect(operation.summary, `${method} ${path}`).toBeTruthy();
        expect(operation.tags?.length).toBeGreaterThan(0);
        const success =
          operation.responses?.['200'] ?? operation.responses?.['201'];
        expect(success).toBeDefined();
        expect(JSON.stringify(success)).toContain('schema');
        expect(operation.responses?.['400']).toBeDefined();
        if (
          !['/api/health', '/api/auth/login', '/api/auth/register'].includes(
            path,
          )
        )
          expect(operation.security).toEqual([{ bearer: [] }]);
        if (
          ['post', 'patch'].includes(method) &&
          !path.endsWith('/close') &&
          !path.endsWith('/run')
        )
          expect(operation.requestBody, path).toBeDefined();
      }
    }
    expect(operations).toBe(24);
    expect(doc.components?.schemas?.User?.properties).not.toHaveProperty(
      'passwordHash',
    );
    expect(doc.components?.schemas?.CreateTicketDto.required).toContain(
      'subject',
    );
  });
});
