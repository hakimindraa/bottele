export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export interface TelegramInlineButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface TelegramKeyboardButton {
  text: string;
}

export const DEFAULT_PERSISTENT_KEYBOARD: TelegramKeyboardButton[][] = [
  [
    { text: "⚡ Live Scout Media" },
    { text: "📰 Radar Berita" },
  ],
  [
    { text: "🏷️ Filter Kategori" },
    { text: "📈 Topik Hangat" },
  ],
  [
    { text: "☀️ Morning Brief" },
    { text: "⚙️ Pusat Kendali" },
  ],
];

export interface SendTelegramOptions {
  inlineButtons?: TelegramInlineButton[][];
  replyKeyboard?: TelegramKeyboardButton[][];
  customChatId?: string | number;
  disableWebPagePreview?: boolean;
  resizeKeyboard?: boolean;
  isPersistent?: boolean;
}

export async function sendTelegram(
  text: string,
  inlineButtons?: TelegramInlineButton[][],
  customChatId?: string | number,
  replyKeyboard?: TelegramKeyboardButton[][],
  options?: {
    disableWebPagePreview?: boolean;
    resizeKeyboard?: boolean;
    isPersistent?: boolean;
  }
): Promise<any> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = customChatId || process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error("TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum diatur dalam environment variables.");
  }

  const payload: Record<string, any> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: options?.disableWebPagePreview ?? true,
  };

  // 1. Jika ada inline keyboard (tombol di bawah balon chat)
  if (inlineButtons && inlineButtons.length > 0) {
    payload.reply_markup = {
      inline_keyboard: inlineButtons,
    };
  }

  // 2. Jika ada persistent reply keyboard (tombol di bawah layar keyboard)
  if (replyKeyboard && replyKeyboard.length > 0) {
    payload.reply_markup = {
      keyboard: replyKeyboard,
      resize_keyboard: options?.resizeKeyboard ?? true,
      is_persistent: options?.isPersistent ?? true,
    };
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Telegram API error (${response.status}): ${errorBody}`);
  }

  return await response.json();
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  try {
    const payload: Record<string, any> = {
      callback_query_id: callbackQueryId,
      show_alert: showAlert,
    };
    if (text) {
      payload.text = text;
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.error("Gagal answerCallbackQuery:", err);
    return false;
  }
}

export async function editTelegramMessage(
  chatId: string | number,
  messageId: number,
  text: string,
  inlineButtons?: TelegramInlineButton[][]
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  const payload: Record<string, any> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };

  if (inlineButtons) {
    payload.reply_markup = {
      inline_keyboard: inlineButtons,
    };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (error) {
    console.error("Gagal edit pesan Telegram:", error);
    return false;
  }
}

