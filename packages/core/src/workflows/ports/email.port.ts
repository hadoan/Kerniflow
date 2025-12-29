export interface EmailPort {
  send(input: {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string;
    replyTo?: string;
  }): Promise<{ messageId?: string }>;
}
