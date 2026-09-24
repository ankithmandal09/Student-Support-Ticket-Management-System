import { Controller, Get, Inject } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';
import { ApiEndpoint } from './common/api.js';
import { Public } from './common/security.js';
class HealthResponse {
  @ApiProperty({ example: 'ok' }) status: string;
  @ApiProperty({ example: 'student-support-api' }) service: string;
}
@ApiTags('Health')
@Controller()
export class AppController {
  constructor(@Inject(AppService) private readonly appService: AppService) {}
  @Public()
  @Get('health')
  @ApiEndpoint('Check API process health', HealthResponse)
  health() {
    return this.appService.health();
  }
}
