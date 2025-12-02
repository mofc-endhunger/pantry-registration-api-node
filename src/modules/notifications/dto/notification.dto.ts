export type NotificationChannel = 'email' | 'sms' | 'push' | 'webhook';

export type NotificationPriority = 'low' | 'normal' | 'high';

export interface NotificationEnvelope {
  channel: NotificationChannel;
  to: string | string[];
  subjectOrTitle?: string;
  body?: string;
  templateId?: string;
  variables?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  priority?: NotificationPriority;
  correlationId?: string;
  tenantId?: string;
}

export interface SendResult {
  success: boolean;
  providerMessageId?: string;
  statusCode?: number;
  errorCode?: string;
  errorMessage?: string;
}


