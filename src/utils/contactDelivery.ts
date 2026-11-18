import { contactConfig, whatsappUrl } from '../data/contact';

export type DeliveryChannel = 'whatsapp' | 'clipboard' | 'manual';

export interface DeliveryResult {
  channel: DeliveryChannel;
  ok: boolean;
  /** Honest status: nothing is ever sent on the visitor's behalf. */
  message: string;
}

/**
 * Hands a prepared message to the studio's configured channel, the same way
 * the consultation form always has: WhatsApp when a number is configured,
 * otherwise the clipboard for Instagram. The visitor still presses Send.
 */
export async function deliverToStudio(message: string): Promise<DeliveryResult> {
  const url = whatsappUrl(message);
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return { channel: 'whatsapp', ok: true, message: 'Your message is ready in WhatsApp. Press Send to reach us.' };
  }
  try {
    await navigator.clipboard.writeText(message);
    return { channel: 'clipboard', ok: true, message: `Copied. Paste it into our Instagram messages (${contactConfig.instagramHandle}) to send.` };
  } catch {
    return { channel: 'manual', ok: false, message: 'Send us these details on Instagram and we will reply.' };
  }
}
