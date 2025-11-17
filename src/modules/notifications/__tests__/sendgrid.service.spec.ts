import { SendgridService } from '../sendgrid.service';

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }]),
}));
import * as sg from '@sendgrid/mail';

describe('SendgridService', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('sends email when configured', async () => {
    process.env.SENDGRID_API_KEY = 'SG.TEST';
    const svc = new SendgridService();
    const res = await svc.sendEmail('from@test.com', 'to@test.com', 'subj', '<b>hi</b>');
    expect(res.success).toBe(true);
  });

  it('handles send errors gracefully', async () => {
    // mock send to reject
    (sg as unknown as { send: jest.Mock }).send.mockRejectedValueOnce(new Error('smtp fail'));
    process.env.SENDGRID_API_KEY = 'SG.TEST';
    const svc = new SendgridService();
    const res = await svc.sendEmail('from@test.com', 'to@test.com', 'subj', '<b>hi</b>');
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });
});
