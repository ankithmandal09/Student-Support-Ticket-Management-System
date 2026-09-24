import 'reflect-metadata';
import { mkdir, writeFile } from 'node:fs/promises';
import { NestFactory } from '@nestjs/core';
import { AppController } from '../dist/app.controller.js';
import { AppService } from '../dist/app.service.js';
import { AuthController } from '../dist/modules/auth/auth.controller.js';
import { AuthService } from '../dist/modules/auth/auth.service.js';
import { UsersController } from '../dist/modules/users/users.controller.js';
import { UsersService } from '../dist/modules/users/users.service.js';
import { TicketsController } from '../dist/modules/tickets/tickets.controller.js';
import { TicketsService } from '../dist/modules/tickets/tickets.service.js';
import { SlaController } from '../dist/modules/sla/sla.controller.js';
import { SlaService } from '../dist/modules/sla/sla.service.js';
import { DashboardController } from '../dist/modules/dashboard/dashboard.controller.js';
import { DashboardService } from '../dist/modules/dashboard/dashboard.service.js';
import { configureApp, createSwagger } from '../dist/setup.js';

// Documentation generation only: no HTTP listener or database connection.
class DocumentationModule {}
const app = await NestFactory.create({
  module: DocumentationModule,
  controllers: [AppController, AuthController, UsersController, TicketsController, SlaController, DashboardController],
  providers: [AppService, AuthService, UsersService, TicketsService, SlaService, DashboardService].map(provide => ({ provide, useValue: {} })),
}, { logger: false });
try {
  configureApp(app);
  await mkdir('docs', { recursive: true });
  await writeFile('docs/openapi.json', JSON.stringify(createSwagger(app), null, 2) + '\n');
  console.log('Exported docs/openapi.json');
} finally { await app.close(); }
