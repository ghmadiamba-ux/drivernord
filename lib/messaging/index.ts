import type { MessagingProvider } from './types';
import { simulatedProvider } from './simulatedProvider';
import { createSmsProvider } from './smsProvider';

export type { MessagingProvider, MessageChannel, SendMessageInput, SendMessageResult } from './types';

// Returns the active messaging provider.
// Default: simulated (console.log only — no network calls, safe for development).
// Real SMS: set SMS_PROVIDER + credentials in .env.local (see .env.local.example).
// WhatsApp: not yet implemented; reserved for a future provider branch.
export function getMessagingProvider(): MessagingProvider {
  if (process.env.SMS_PROVIDER) {
    return createSmsProvider();
  }
  return simulatedProvider;
}
