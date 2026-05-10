export type MessageChannel = 'sms' | 'whatsapp' | 'simulated';

export interface SendMessageInput {
  to:   string;
  body: string;
}

export interface SendMessageResult {
  ok:         boolean;
  channel:    MessageChannel;
  messageId?: string;
  error?:     string;
}

export interface MessagingProvider {
  channel: MessageChannel;
  sendMessage(input: SendMessageInput): Promise<SendMessageResult>;
}
