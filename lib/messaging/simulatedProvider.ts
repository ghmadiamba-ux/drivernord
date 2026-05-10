import type { MessagingProvider, SendMessageInput, SendMessageResult } from './types';

export const simulatedProvider: MessagingProvider = {
  channel: 'simulated',

  async sendMessage({ to, body }: SendMessageInput): Promise<SendMessageResult> {
    console.log(
      `[messaging] SIMULATED SEND to ${to}\n` +
      `─────────────────────────────\n` +
      body +
      `\n─────────────────────────────`,
    );
    return { ok: true, channel: 'simulated' };
  },
};
