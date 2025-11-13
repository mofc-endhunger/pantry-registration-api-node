import { MailerService } from '../mailer.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({ sendMail: jest.fn().mockResolvedValue({}) }),
}));

describe('MailerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses jsonTransport in test mode', () => {
    process.env.NODE_ENV = 'test';
    new MailerService();
    expect(nodemailer.createTransport).toHaveBeenCalledWith({ jsonTransport: true });
  });

  it('sends reset email with expected fields and default URL', async () => {
    // Ensure test mode to avoid smtp branch
    process.env.NODE_ENV = 'test';
    delete process.env.PASSWORD_RESET_URL;
    const svc = new MailerService() as any;
    const transporter = (nodemailer.createTransport as jest.Mock).mock.results[0].value;
    await svc.sendResetEmail('u@example.com', 'abc');
    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: expect.any(String),
        to: 'u@example.com',
        subject: expect.stringMatching(/password reset/i),
        text: expect.stringContaining('abc'),
        html: expect.stringContaining('abc'),
      }),
    );
  });

  it('uses configured PASSWORD_RESET_URL when provided', async () => {
    process.env.NODE_ENV = 'test';
    process.env.PASSWORD_RESET_URL = 'https://app/reset';
    const svc = new MailerService() as any;
    const transporter = (nodemailer.createTransport as jest.Mock).mock.results[0].value;
    await svc.sendResetEmail('u@example.com', 'xyz');
    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('https://app/reset?token=xyz'),
        html: expect.stringContaining('https://app/reset?token=xyz'),
      }),
    );
  });
});
