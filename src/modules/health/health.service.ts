import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getHealth() {
    return {
      status: 200,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
