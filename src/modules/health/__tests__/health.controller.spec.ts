import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../health.controller';
import { HealthService } from '../health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return health status from service', () => {
      const expectedResult = {
        status: 200,
        timestamp: '2024-01-01T00:00:00.000Z',
        uptime: 123.45,
      };

      jest.spyOn(service, 'getHealth').mockReturnValue(expectedResult);

      const result = controller.getHealth();

      expect(service.getHealth).toHaveBeenCalled();
      expect(result).toBe(expectedResult);
    });
  });
});
