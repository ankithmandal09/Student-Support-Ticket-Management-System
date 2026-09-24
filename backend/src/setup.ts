import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
export function configureApp(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      forbidUnknownValues: true,
    }),
  );
  app.enableCors({ origin: '*', credentials: false });
}
export function createSwagger(app: INestApplication) {
  return SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Student Support & Ticket Management')
      .setDescription(
        'College Student Support Operations API for managing student tickets, assignments, SLAs, comments, resolutions, and audit history. Supports role-based access for ADMIN, STAFF, and STUDENT users, JWT authentication with Bearer tokens, UTC timestamps, and calendar-minute SLA calculations with consistent API error responses.',
      )
      .setVersion('1.0.0')
      .addBearerAuth()
      .build(),
  );
}
