import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  checkHealth() {
    return {
      status: 'ok',
      service: 'aeriva-backend',
      message: 'Aeriva backend is running',
      timestamp: new Date().toISOString(),
    };
  }
}