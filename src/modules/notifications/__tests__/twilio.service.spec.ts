import { TwilioService } from '../twilio.service';

jest.mock('twilio', () => {
  return jest.fn().mockImplementation((_sid: string, _token: string) => {
    return {
      messages: {
        create: jest.fn().mockResolvedValue({ sid: 'SM_TEST' }),
      },
    };
  });
});
import Twilio from 'twilio';

describe('TwilioService', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('sends SMS when configured', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC123';
    process.env.TWILIO_AUTH_TOKEN = 'token';
    process.env.TWILIO_PHONE_NUMBER = '+10000000000';
    const svc = new TwilioService();
    const res = await svc.sendSms(undefined, '+15555555555', 'hello');
    expect(res.success).toBe(true);
    expect(res.sid).toBeDefined();
  });

  it('returns not-configured when env missing', async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    const svc = new TwilioService();
    const res = await svc.sendSms(undefined, '+15555555555', 'hello');
    expect(res.success).toBe(false);
    expect(res.reason).toBe('not-configured');
  });

  it('handles provider errors gracefully', async () => {
    // mock twilio to throw
    (Twilio as unknown as jest.Mock).mockImplementation(() => ({
      messages: { create: jest.fn().mockRejectedValue(new Error('boom')) },
    }));
    process.env.TWILIO_ACCOUNT_SID = 'AC123';
    process.env.TWILIO_AUTH_TOKEN = 'token';
    const svc = new TwilioService();
    const res = await svc.sendSms(undefined, '+15555555555', 'hi');
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });
});
