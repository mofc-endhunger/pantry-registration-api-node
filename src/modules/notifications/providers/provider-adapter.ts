import type { NotificationEnvelope, SendResult, NotificationChannel } from '../dto/notification.dto';

export interface ProviderAdapter {
  readonly name: string;
  readonly supportedChannels: ReadonlyArray<NotificationChannel>;
  send(notification: NotificationEnvelope): Promise<SendResult>;
}

export const NOTIFICATION_PROVIDER_ADAPTERS = 'NOTIFICATION_PROVIDER_ADAPTERS';


