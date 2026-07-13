import express from "express";
import Redis from "ioredis";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { describeImageWithVision, generateAiReply, getConversationHistory } from "./ai.js";
import { findRuleReply } from "./rules.js";
import { downloadTelegramFile, getTelegramFile, sendTelegramMessage, setTelegramWebhook } from "./telegram.js";
import { adminRouter, requireAdminAuth } from "./admin.js";
import { renderAdminPage } from "./adminPage.js";

const app = express();
const redis = new Redis(config.REDIS_URL);

app.use(express.json());

app.get("/admin", requireAdminAuth, (_req, res) => {
  res.type("html").send(renderAdminPage());
});

app.use("/api/admin", adminRouter);

app.get("/health", async (_req, res) => {
  await redis.ping();
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true });
});

app.post("/telegram/set-webhook", async (_req, res, next) => {
  try {
    const result = await setTelegramWebhook();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/telegram/webhook", async (req, res, next) => {
  try {
    const secret = req.header("x-telegram-bot-api-secret-token");
    if (secret !== config.TELEGRAM_WEBHOOK_SECRET) {
      return res.status(401).json({ error: "invalid webhook secret" });
    }

    const incoming = extractIncomingMessage(req.body);
    if (!incoming) {
      return res.json({ ok: true, ignored: true });
    }

    const contact = await upsertContact(incoming);
    const inboundMessage = await saveInboundMessage(contact.id, incoming);
    if (!inboundMessage.created) {
      return res.json({ ok: true, mode: "duplicate" });
    }

    if (contact.isBlocked) {
      return res.json({ ok: true, mode: "blocked" });
    }

    if (contact.isHumanTakeover) {
      return res.json({ ok: true, mode: "human_takeover" });
    }

    const rateLimitKey = `reply-rate:${incoming.chatId}`;
    const alreadyReplied = await redis.get(rateLimitKey);
    if (alreadyReplied) {
      return res.json({ ok: true, mode: "rate_limited" });
    }
    await redis.set(rateLimitKey, "1", "EX", 3);

    const aiMessageText = await enrichIncomingMessageForAi(incoming);
    const ruleReply = await findRuleReply(incoming.text);
    const history = ruleReply ? [] : await getConversationHistory(prisma, contact.id, inboundMessage.message.id);
    const reply = ruleReply || await generateAiReply({
      messageText: aiMessageText,
      contact,
      history
    });

    try {
      await sendTelegramMessage(incoming.chatId, reply, {
        businessConnectionId: incoming.businessConnectionId
      });
      await saveOutboundMessage(contact.id, reply);
    } catch (error) {
      console.error("Telegram reply failed:", {
        chatId: incoming.chatId,
        businessConnectionId: incoming.businessConnectionId,
        message: error.message
      });
      return res.json({ ok: true, mode: "reply_failed" });
    }

    res.json({ ok: true, mode: ruleReply ? "rule" : "ai" });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "internal server error" });
});

function extractIncomingMessage(update) {
  const message = update.business_message || update.message;
  const text = describeIncomingMessage(message);

  if (!message?.chat?.id || !message.from?.id || !text) {
    return null;
  }

  return {
    chatId: String(message.chat.id),
    telegramUserId: String(message.from.id),
    businessConnectionId: message.business_connection_id,
    telegramMessageId: message.message_id ? String(message.message_id) : undefined,
    text,
    photoFileId: getLargestPhotoFileId(message.photo),
    username: message.from.username,
    firstName: message.from.first_name,
    lastName: message.from.last_name
  };
}

async function enrichIncomingMessageForAi(incoming) {
  if (!incoming.photoFileId) {
    return incoming.text;
  }

  try {
    const telegramFile = await getTelegramFile(incoming.photoFileId);
    const downloaded = await downloadTelegramFile(telegramFile.file_path);
    const contentType = normalizeImageContentType(telegramFile.file_path, downloaded.contentType);
    const imageDataUrl = toDataUrl(downloaded.buffer, contentType);
    const description = await describeImageWithVision(imageDataUrl);

    if (!description) {
      return incoming.text;
    }

    return [
      incoming.text,
      "",
      `VISION_RESULT: ${description}`,
      "Reply naturally based on the image result above. Do not say you cannot see the image."
    ].join("\n");
  } catch (error) {
    console.error("Image enrich failed:", {
      chatId: incoming.chatId,
      message: error.message
    });
    return incoming.text;
  }
}

function describeIncomingMessage(message) {
  if (!message) return null;

  const plainText = message.text?.trim();
  if (plainText) {
    if (hasCustomEmoji(message.entities)) {
      return `${plainText}\n\n[系统提示：客户消息里包含 Telegram 自定义表情，请按正常聊天语气理解和接话。]`;
    }
    return plainText;
  }

  const caption = message.caption?.trim();
  const captionText = caption ? `，附言：${caption}` : "";

  if (message.photo) {
    return `客户发来一张图片${captionText}。`;
  }

  if (message.sticker) {
    const emoji = message.sticker.emoji ? ` ${message.sticker.emoji}` : "";
    const type = message.sticker.is_animated ? "动态贴纸" : message.sticker.is_video ? "视频贴纸" : "贴纸";
    return `客户发来一个${type}${emoji}。[系统提示：把它当成聊天表情自然接话。]`;
  }

  if (message.animation) {
    return `客户发来一个动图${captionText}。[系统提示：把它当成表情包自然接话。]`;
  }

  if (message.video) {
    return `客户发来一个视频${captionText}。[系统提示：当前机器人不能直接看懂视频内容，需要细节时让客户补充说明。]`;
  }

  if (message.voice) {
    return "客户发来一条语音。[系统提示：当前机器人不能听语音内容，请自然一点让客户打字说。]";
  }

  if (message.audio) {
    return `客户发来一段音频${captionText}。[系统提示：当前机器人不能听音频内容，请自然回应。]`;
  }

  if (message.document) {
    const fileName = message.document.file_name ? `：${message.document.file_name}` : "";
    return `客户发来一个文件${fileName}${captionText}。[系统提示：当前机器人不能直接读取文件内容，请自然回应。]`;
  }

  if (message.video_note) {
    return "客户发来一个圆形视频。[系统提示：当前机器人不能直接看懂视频内容，请自然回应。]";
  }

  if (message.contact) {
    return "客户发来一个联系人。[系统提示：自然确认收到。]";
  }

  if (message.location || message.venue) {
    return "客户发来一个位置。[系统提示：自然确认收到，不要乱编地址细节。]";
  }

  if (message.poll) {
    return `客户发来一个投票：${message.poll.question || ""}`.trim();
  }

  return null;
}

function hasCustomEmoji(entities = []) {
  return entities.some((entity) => entity.type === "custom_emoji");
}

function getLargestPhotoFileId(photos = []) {
  if (!Array.isArray(photos) || photos.length === 0) return undefined;

  const largest = [...photos].sort((left, right) => {
    const leftSize = left.file_size || left.width * left.height || 0;
    const rightSize = right.file_size || right.width * right.height || 0;
    return rightSize - leftSize;
  })[0];

  return largest?.file_id;
}

function normalizeImageContentType(filePath, contentType) {
  if (contentType?.startsWith("image/")) {
    return contentType;
  }

  const lowerPath = String(filePath || "").toLowerCase();
  if (lowerPath.endsWith(".png")) return "image/png";
  if (lowerPath.endsWith(".webp")) return "image/webp";
  if (lowerPath.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function toDataUrl(buffer, contentType) {
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

async function upsertContact(message) {
  return prisma.contact.upsert({
    where: { telegramUserId: message.telegramUserId },
    create: {
      telegramUserId: message.telegramUserId,
      telegramChatId: message.chatId,
      businessConnectionId: message.businessConnectionId,
      username: message.username,
      firstName: message.firstName,
      lastName: message.lastName
    },
    update: {
      telegramChatId: message.chatId,
      businessConnectionId: message.businessConnectionId,
      username: message.username,
      firstName: message.firstName,
      lastName: message.lastName
    }
  });
}

async function saveInboundMessage(contactId, message) {
  if (message.telegramMessageId) {
    const existing = await prisma.message.findUnique({
      where: {
        contactId_telegramMessageId: {
          contactId,
          telegramMessageId: message.telegramMessageId
        }
      }
    });

    if (existing) {
      return { created: false, message: existing };
    }
  }

  const created = await prisma.message.create({
    data: {
      contactId,
      direction: "INBOUND",
      telegramMessageId: message.telegramMessageId,
      text: message.text
    }
  });

  return { created: true, message: created };
}

async function saveOutboundMessage(contactId, text) {
  return prisma.message.create({
    data: {
      contactId,
      direction: "OUTBOUND",
      text
    }
  });
}

app.listen(config.PORT, () => {
  console.log(`Telegram business bot listening on http://localhost:${config.PORT}`);
});
