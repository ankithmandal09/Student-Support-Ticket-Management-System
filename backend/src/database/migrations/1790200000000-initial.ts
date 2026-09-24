import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1790200000000 implements MigrationInterface {
  name = 'Initial1790200000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(100) NOT NULL,
      email varchar(254) NOT NULL UNIQUE, "passwordHash" varchar NOT NULL,
      role varchar NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT','STAFF','ADMIN')),
      department varchar(100), "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE TABLE sla_policies (
      priority varchar PRIMARY KEY CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT')),
      "responseMinutes" integer NOT NULL CHECK ("responseMinutes" > 0),
      "resolutionMinutes" integer NOT NULL CHECK ("resolutionMinutes" >= "responseMinutes")
    )`);
    await q.query(
      `INSERT INTO sla_policies VALUES ('LOW',480,2880),('MEDIUM',240,1440),('HIGH',120,480),('URGENT',30,240)`,
    );
    await q.query(`CREATE TABLE tickets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "ticketNumber" varchar NOT NULL UNIQUE,
      "studentId" uuid NOT NULL REFERENCES users(id), category varchar NOT NULL CHECK (category IN ('FEES','ATTENDANCE','ID_CARD','DOCUMENTS','CERTIFICATES','OTHER')),
      subject varchar(200) NOT NULL, description text NOT NULL,
      priority varchar NOT NULL REFERENCES sla_policies(priority),
      status varchar NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW','ASSIGNED','IN_PROGRESS','PENDING_STUDENT','PENDING_INTERNAL','RESOLVED','CLOSED','REOPENED','CANCELLED')),
      source varchar NOT NULL CHECK (source IN ('STUDENT_PORTAL','STAFF_CREATED')),
      "assignedTo" uuid REFERENCES users(id), "assignedTeam" varchar(100), "pendingReason" text,
      "responseDueAt" timestamptz NOT NULL, "resolutionDueAt" timestamptz NOT NULL,
      "responseMinutes" integer NOT NULL CHECK ("responseMinutes" > 0), "resolutionMinutes" integer NOT NULL CHECK ("resolutionMinutes" >= "responseMinutes"),
      "firstResponseAt" timestamptz, "pausedAt" timestamptz,
      "pausedMilliseconds" double precision NOT NULL DEFAULT 0 CHECK ("pausedMilliseconds" >= 0),
      "resolvedAt" timestamptz, "resolvedBy" uuid REFERENCES users(id), "resolutionNote" text, "resolutionCategory" varchar(100),
      "closedAt" timestamptz, "reopenedAt" timestamptz, "reopenedBy" uuid REFERENCES users(id), "reopenReason" text,
      "escalationLevel" integer NOT NULL DEFAULT 0 CHECK ("escalationLevel" BETWEEN 0 AND 2),
      "reopenCount" integer NOT NULL DEFAULT 0, version integer NOT NULL DEFAULT 1,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CHECK (("assignedTo" IS NULL) = ("assignedTeam" IS NULL)),
      CHECK ((status = 'PENDING_STUDENT') = ("pausedAt" IS NOT NULL)),
      CHECK (status NOT IN ('PENDING_STUDENT','PENDING_INTERNAL') OR "pendingReason" IS NOT NULL),
      CHECK (status NOT IN ('ASSIGNED','IN_PROGRESS','PENDING_STUDENT','PENDING_INTERNAL','RESOLVED','CLOSED') OR "assignedTo" IS NOT NULL),
      CHECK (status NOT IN ('RESOLVED','CLOSED') OR ("resolvedAt" IS NOT NULL AND "resolvedBy" IS NOT NULL AND "resolutionNote" IS NOT NULL))
    )`);
    await q.query(
      `CREATE INDEX tickets_student_created_idx ON tickets ("studentId", "createdAt")`,
    );
    await q.query(
      `CREATE INDEX tickets_status_due_idx ON tickets (status, "resolutionDueAt")`,
    );
    await q.query(
      `CREATE INDEX tickets_assignee_idx ON tickets ("assignedTo")`,
    );
    await q.query(`CREATE TABLE ticket_comments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "ticketId" uuid NOT NULL REFERENCES tickets(id),
      "userId" uuid NOT NULL REFERENCES users(id), message text NOT NULL, internal boolean NOT NULL DEFAULT false,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(
      `CREATE INDEX comments_ticket_created_idx ON ticket_comments ("ticketId", "createdAt")`,
    );
    await q.query(`CREATE TABLE ticket_activities (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "ticketId" uuid NOT NULL REFERENCES tickets(id),
      "actorId" uuid REFERENCES users(id), action varchar NOT NULL, metadata jsonb NOT NULL DEFAULT '{}',
      internal boolean NOT NULL DEFAULT false, "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(
      `CREATE INDEX activities_ticket_created_idx ON ticket_activities ("ticketId", "createdAt")`,
    );
    await q.query(
      `CREATE FUNCTION reject_activity_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Ticket activities are immutable'; END $$`,
    );
    await q.query(
      `CREATE TRIGGER immutable_activities BEFORE UPDATE OR DELETE ON ticket_activities FOR EACH ROW EXECUTE FUNCTION reject_activity_mutation()`,
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(
      'DROP TABLE ticket_activities, ticket_comments, tickets, sla_policies, users',
    );
    await q.query('DROP FUNCTION reject_activity_mutation()');
  }
}
