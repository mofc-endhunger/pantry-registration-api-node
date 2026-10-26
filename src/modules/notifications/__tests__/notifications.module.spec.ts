import { MODULE_METADATA } from '@nestjs/common/constants';
import { NotificationsModule } from '../notifications.module';

describe('NotificationsModule', () => {
  it('registers no HTTP controllers', () => {
    // The former POST /twilio/sms and /twilio/email routes had no auth and took an
    // arbitrary sender, recipient and body — open SMS and email relays. Sends are
    // server-side only; a controller here would put a public send endpoint back.
    const controllers: unknown[] =
      Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, NotificationsModule) ?? [];
    expect(controllers).toHaveLength(0);
  });
});
