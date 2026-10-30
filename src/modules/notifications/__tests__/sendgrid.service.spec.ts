import { SendgridService } from '../sendgrid.service';

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }]),
}));
import * as sg from '@sendgrid/mail';

const sendMock = (sg as unknown as { send: jest.Mock }).send;

describe('SendgridService', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    delete process.env.SENDGRID_ENABLED;
    delete process.env.SENDGRID_FROM_EMAIL;
    sendMock.mockClear();
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe('sendTemplate', () => {
    it('sends templateId and dynamicTemplateData without subject or html', async () => {
      process.env.SENDGRID_API_KEY = 'SG.TEST';
      const svc = new SendgridService();

      const res = await svc.sendTemplate('to@test.com', 'd-abc', { trans_num: '42' });

      expect(res.success).toBe(true);
      // The template owns subject and body; sending either would be overridden anyway.
      expect(sendMock).toHaveBeenCalledWith({
        from: 'no-reply@freshtrak.com',
        to: 'to@test.com',
        templateId: 'd-abc',
        dynamicTemplateData: { trans_num: '42' },
      });
    });

    it('uses SENDGRID_FROM_EMAIL as the sender when set', async () => {
      process.env.SENDGRID_API_KEY = 'SG.TEST';
      process.env.SENDGRID_FROM_EMAIL = 'confirm@example.org';
      const svc = new SendgridService();

      await svc.sendTemplate('to@test.com', 'd-abc', {});

      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'confirm@example.org' }),
      );
    });

    it('prefers a sender passed in the options', async () => {
      process.env.SENDGRID_API_KEY = 'SG.TEST';
      process.env.SENDGRID_FROM_EMAIL = 'confirm@example.org';
      const svc = new SendgridService();

      await svc.sendTemplate('to@test.com', 'd-abc', {}, { from: 'other@example.org' });

      expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ from: 'other@example.org' }));
    });

    it('sends inline attachments for the template to show by Content-ID', async () => {
      process.env.SENDGRID_API_KEY = 'SG.TEST';
      const svc = new SendgridService();
      const qr = {
        content: 'cG5n',
        filename: 'reservation-qr.png',
        type: 'image/png',
        disposition: 'inline' as const,
        content_id: 'reservation-qr',
      };

      await svc.sendTemplate(
        'to@test.com',
        'd-abc',
        { qr_cid: 'reservation-qr' },
        { attachments: [qr] },
      );

      expect(sendMock).toHaveBeenCalledWith({
        from: 'no-reply@freshtrak.com',
        to: 'to@test.com',
        templateId: 'd-abc',
        dynamicTemplateData: { qr_cid: 'reservation-qr' },
        attachments: [qr],
      });
    });

    it('sends no attachments key when there are none', async () => {
      process.env.SENDGRID_API_KEY = 'SG.TEST';
      const svc = new SendgridService();

      await svc.sendTemplate('to@test.com', 'd-abc', {}, { attachments: [] });

      expect(sendMock.mock.calls[0][0]).not.toHaveProperty('attachments');
    });

    it('skips without calling SendGrid when SENDGRID_ENABLED is false', async () => {
      process.env.SENDGRID_API_KEY = 'SG.TEST';
      process.env.SENDGRID_ENABLED = 'false';
      const svc = new SendgridService();

      const res = await svc.sendTemplate('to@test.com', 'd-abc', {});

      expect(res).toEqual({ success: false, error: 'disabled' });
      expect(sendMock).not.toHaveBeenCalled();
    });

    it('treats an unset SENDGRID_ENABLED as enabled', async () => {
      process.env.SENDGRID_API_KEY = 'SG.TEST';
      const svc = new SendgridService();

      const res = await svc.sendTemplate('to@test.com', 'd-abc', {});

      expect(res.success).toBe(true);
    });

    it('skips without calling SendGrid when no API key is configured', async () => {
      delete process.env.SENDGRID_API_KEY;
      const svc = new SendgridService();

      const res = await svc.sendTemplate('to@test.com', 'd-abc', {});

      expect(res).toEqual({ success: false, error: 'not_configured' });
      expect(sendMock).not.toHaveBeenCalled();
    });

    it('returns failure instead of throwing when SendGrid rejects', async () => {
      process.env.SENDGRID_API_KEY = 'SG.TEST';
      const sgError = Object.assign(new Error('Forbidden'), {
        response: {
          body: {
            errors: [{ message: 'The from address does not match a verified Sender Identity.' }],
          },
        },
      });
      sendMock.mockRejectedValueOnce(sgError);
      const svc = new SendgridService();

      const res = await svc.sendTemplate('to@test.com', 'd-abc', {});

      expect(res.success).toBe(false);
      expect(res.error).toBe(sgError);
    });
  });
});
