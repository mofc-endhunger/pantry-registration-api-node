import { HealthService } from '../health.service';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(() => {
    service = new HealthService();
  });

  describe('getHealth', () => {
    it('should return health status object', () => {
      const result = service.getHealth();

      expect(result).toBeDefined();
      expect(result.status).toBe(200);
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
    });

    it('should return valid timestamp', () => {
      const result = service.getHealth();
      const timestamp = new Date(result.timestamp);

      expect(timestamp).toBeInstanceOf(Date);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });

    it('should return numeric uptime', () => {
      const result = service.getHealth();

      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });
});
