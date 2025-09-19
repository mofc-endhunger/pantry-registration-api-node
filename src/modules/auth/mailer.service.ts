import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailerService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: +(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'user@example.com',
        pass: process.env.SMTP_PASS || 'password',
      },
    });
  }

  async sendResetEmail(to: string, token: string) {
    const resetUrl = `${process.env.PASSWORD_RESET_URL || 'http://localhost:3000/reset-password'}?token=${token}`;
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@example.com',
      to,
      subject: 'Password Reset Request',
      text: `You requested a password reset. Click the link to reset your password: ${resetUrl}`,
      html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Reset your password</a></p>`,
    });
  }
}
