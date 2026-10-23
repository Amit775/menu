import { Controller, Get } from '@nestjs/common';
import { type HealthResponse, healthRoute } from '@menu/shared/contracts';

@Controller()
export class HealthController {
  @Get(healthRoute.path)
  getHealth(): HealthResponse {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) };
  }
}
