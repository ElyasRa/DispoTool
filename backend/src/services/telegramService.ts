import { Auftrag } from '../types/models';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

interface TelegramResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
}

interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

/**
 * Send a message via Telegram Bot API
 */
async function sendMessage(
  chatId: string,
  text: string,
  replyMarkup?: InlineKeyboardMarkup
): Promise<TelegramResponse> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN not configured. Message not sent.');
    return { ok: false, description: 'TELEGRAM_BOT_TOKEN not configured' };
  }

  const url = `${TELEGRAM_API_URL}${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
  };

  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as TelegramResponse;

    if (!data.ok) {
      console.error('Telegram API error:', data.description);
    }

    return data;
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    return { ok: false, description: 'Network error' };
  }
}

/**
 * Generate Google Maps link from latitude and longitude
 */
function generateMapsLink(latitude: number | null, longitude: number | null): string {
  if (latitude && longitude) {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  }
  return '';
}

/**
 * Generate address from order
 */
function formatAddress(order: Auftrag): string {
  return `${order.strasse} ${order.hausnummer}, ${order.plz} ${order.stadt}`;
}

/**
 * Send order assignment notification to a Monteur via Telegram
 */
export async function sendOrderAssignment(
  monteurChatId: string,
  order: Auftrag
): Promise<TelegramResponse> {
  const address = formatAddress(order);
  const mapsLink = generateMapsLink(order.latitude, order.longitude);

  let message = `<b>📋 Neuer Auftrag zugewiesen!</b>\n\n`;
  message += `<b>Auftragsnummer:</b> ${order.auftragsnummer}\n`;
  message += `<b>Gewerk:</b> ${order.gewerk}\n`;
  message += `<b>Kunde:</b> ${order.vorname} ${order.name}\n`;
  message += `<b>Adresse:</b> ${address}\n`;
  message += `<b>Telefon:</b> ${order.telefon}\n`;

  if (mapsLink) {
    message += `\n<a href="${mapsLink}">📍 In Google Maps öffnen</a>`;
  }

  const inlineKeyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: '✅ Annehmen', callback_data: `accept_order_${order.id}` },
        { text: '❌ Ablehnen', callback_data: `reject_order_${order.id}` },
      ],
    ],
  };

  return sendMessage(monteurChatId, message, inlineKeyboard);
}

/**
 * Send notification that order was accepted
 */
export async function sendOrderAccepted(
  chatId: string,
  order: Auftrag
): Promise<TelegramResponse> {
  const message = `✅ <b>Auftrag ${order.auftragsnummer} wurde angenommen!</b>\n\nViel Erfolg bei der Ausführung!`;
  return sendMessage(chatId, message);
}

/**
 * Send notification that order was rejected
 */
export async function sendOrderRejected(
  chatId: string,
  order: Auftrag
): Promise<TelegramResponse> {
  const message = `❌ <b>Auftrag ${order.auftragsnummer} wurde abgelehnt.</b>\n\nDer Disponent wird benachrichtigt.`;
  return sendMessage(chatId, message);
}

export default {
  sendOrderAssignment,
  sendOrderAccepted,
  sendOrderRejected,
};
