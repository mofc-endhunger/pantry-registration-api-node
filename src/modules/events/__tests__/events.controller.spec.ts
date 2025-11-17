import { EventsController } from '../events.controller';
import { EventsService } from '../events.service';
import { PublicScheduleService } from '../../public-schedule/public-schedule.service';

describe('EventsController', () => {
	let controller: EventsController;
	let eventsService: {
		list: jest.Mock;
		get: jest.Mock;
		create: jest.Mock;
		update: jest.Mock;
		remove: jest.Mock;
		listTimeslots: jest.Mock;
		createTimeslot: jest.Mock;
		updateTimeslot: jest.Mock;
		removeTimeslot: jest.Mock;
	};
	let publicSchedule: { getEventDateIdDefault: jest.Mock; buildEventDateStructure: jest.Mock };

	beforeEach(() => {
		eventsService = {
			list: jest.fn(),
			get: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			remove: jest.fn(),
			listTimeslots: jest.fn(),
			createTimeslot: jest.fn(),
			updateTimeslot: jest.fn(),
			removeTimeslot: jest.fn(),
		} as any;
		publicSchedule = {
			getEventDateIdDefault: jest.fn(),
			buildEventDateStructure: jest.fn(),
		} as any;
		controller = new EventsController(eventsService as unknown as EventsService, publicSchedule as unknown as PublicScheduleService);
	});

	it('list parses active query and delegates to service', () => {
		controller.list('true', '2025-01-01', '2025-01-31');
		expect(eventsService.list).toHaveBeenCalledWith({ active: true, from: '2025-01-01', to: '2025-01-31' });
		controller.list(undefined as any, undefined as any, undefined as any);
		expect(eventsService.list).toHaveBeenCalledWith({ active: undefined, from: undefined, to: undefined });
	});

	it('get delegates to service', () => {
		controller.get(5);
		expect(eventsService.get).toHaveBeenCalledWith(5);
	});

	it('create/update/remove delegate to service', () => {
		controller.create({ name: 'E' } as any);
		controller.update(2, { name: 'U' } as any);
		controller.remove(3);
		expect(eventsService.create).toHaveBeenCalled();
		expect(eventsService.update).toHaveBeenCalledWith(2, expect.any(Object));
		expect(eventsService.remove).toHaveBeenCalledWith(3);
	});

	it('timeslot methods delegate and attach event id', () => {
		controller.listTimeslots(9);
		controller.createTimeslot(9, { capacity: 10 } as any);
		controller.updateTimeslot(7, { capacity: 5 } as any);
		controller.removeTimeslot(7);
		expect(eventsService.listTimeslots).toHaveBeenCalledWith(9);
		expect(eventsService.createTimeslot).toHaveBeenCalledWith(expect.objectContaining({ event_id: 9 }));
		expect(eventsService.updateTimeslot).toHaveBeenCalledWith(7, expect.any(Object));
		expect(eventsService.removeTimeslot).toHaveBeenCalledWith(7);
	});

	it('public date default returns null structure when no date id', async () => {
		publicSchedule.getEventDateIdDefault.mockResolvedValueOnce(null);
		const res = await controller.getPublicDateStructureDefault(1);
		expect(res).toEqual({ event_date: null });
	});

	it('public date default returns built structure when id exists', async () => {
		publicSchedule.getEventDateIdDefault.mockResolvedValueOnce(123);
		publicSchedule.buildEventDateStructure.mockResolvedValueOnce({ event_date: { id: 123 } });
		const res = await controller.getPublicDateStructureDefault(1);
		expect(publicSchedule.buildEventDateStructure).toHaveBeenCalledWith(123);
		expect(res).toEqual({ event_date: { id: 123 } });
	});

	it('public date specific delegates to build', async () => {
		await controller.getPublicDateStructure(1, 55);
		expect(publicSchedule.buildEventDateStructure).toHaveBeenCalledWith(55);
	});
});
