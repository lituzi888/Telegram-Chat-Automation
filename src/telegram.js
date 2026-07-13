import { config } from "./config.js";

const telegramApi = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`;

export async function sendTelegramMessage(chatId, text, options = {}) {
  const body = {
    chat_id: chatId,
    text
  };

  if (options.businessConnectionId) {
    body.business_connection_id = options.businessConnectionId;
  }

  const response = await fetch(`${telegramApi}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram sendMessage failed: ${response.status} ${body}`);
  }

  return response.json();
}

export async function getTelegramFile(fileId) {
  const response = await fetch(`${telegramApi}/getFile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram getFile failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  if (!data.ok || !data.result?.file_path) {
    throw new Error(`Telegram getFile returned invalid payload: ${JSON.stringify(data)}`);
  }

  return data.result;
}

export async function downloadTelegramFile(filePath) {
  const response = await fetch(`https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${filePath}`);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram file download failed: ${response.status} ${body}`);
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const buffer = Buffer.from(await response.arrayBuffer());

  return { buffer, contentType };
}

export async function setTelegramWebhook() {
  if (!config.PUBLIC_BASE_URL) {
    throw new Error("PUBLIC_BASE_URL is required to set webhook");
  }

  const webhookUrl = `${config.PUBLIC_BASE_URL}/telegram/webhook`;
  const response = await fetch(`${telegramApi}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: config.TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ["message", "business_message", "business_connection"]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram setWebhook failed: ${response.status} ${body}`);
  }

  return response.json();
}
