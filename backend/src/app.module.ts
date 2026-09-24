import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './common/security.js';
import { databaseOptions } from './database/config.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.modules.js';
import { TicketsModule } from './modules/tickets/tickets.module.js';
import { SlaModule } from './modules/sla/sla.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
dotenv.config();

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({ ...databaseOptions(), retryAttempts: 1 }),
    }),
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        return {
          secret,
          signOptions: {
            expiresIn: '1d' as const,
            algorithm: 'HS256' as const,
            issuer: 'student-support',
            audience: 'student-support-api',
          },
          verifyOptions: {
            algorithms: ['HS256' as const],
            issuer: 'student-support',
            audience: 'student-support-api',
          },
        };
      },
    }),
    AuthModule,
    UsersModule,
    TicketsModule,
    SlaModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
