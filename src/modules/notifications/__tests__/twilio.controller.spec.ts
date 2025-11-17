import { TwilioController } from '../twilio.controller';
import { TwilioService } from '../twilio.service';
import { SendgridService } from '../sendgrid.service';
import { HttpException } from '@nestjs/common';

class TwilioServiceMock implements Partial<TwilioService> {
  sendSms = jest.fn();
}

class SendgridServiceMock implements Partial<SendgridService> {
  sendEmail = jest.fn();
}

describe('TwilioController', () => {
  let controller: TwilioController;
  let twilio: TwilioServiceMock;
  let sendgrid: SendgridServiceMock;

  beforeEach(() => {
    twilio = new TwilioServiceMock();
    sendgrid = new SendgridServiceMock();
    controller = new TwilioController(
      twilio as unknown as TwilioService,
      sendgrid as unknown as SendgridService,
    );
  });

  it('sms returns sms_sent when Twilio succeeds', async () => {
    twilio.sendSms.mockResolvedValueOnce({ success: true });
    const res = await controller.sms({
      from_phone_number: undefined,
      to_phone_number: '+1555',
      message: 'hi',
    } as any);
    expect(res).toEqual({ sms_sent: true });
  });

  it('sms throws when Twilio fails', async () => {
    twilio.sendSms.mockResolvedValueOnce({ success: false });
    await expect(
      controller.sms({
        from_phone_number: undefined,
        to_phone_number: '+1555',
        message: 'hi',
      } as any),
    ).rejects.toThrow(HttpException);
  });

  it('email returns email_delivered when SendGrid succeeds', async () => {
    sendgrid.sendEmail.mockResolvedValueOnce({ success: true });
    const res = await controller.email({
      from: 'a@b.com',
      to: 'c@d.com',
      subject: 's',
      content: '<b>x</b>',
    } as any);
    expect(res).toEqual({ email_delivered: true });
  });

  it('email throws when SendGrid fails', async () => {
    sendgrid.sendEmail.mockResolvedValueOnce({ success: false });
    await expect(
      controller.email({
        from: 'a@b.com',
        to: 'c@d.com',
        subject: 's',
        content: '<b>x</b>',
      } as any),
    ).rejects.toThrow(HttpException);
  });
});
