import express from "express";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { getSettingMap, resetSettings, updateSettings } from "./settings.js";
import { sendTelegramMessage } from "./telegram.js";

export const adminRouter = express.Router();

adminRouter.use(requireAdminAuth);

adminRouter.get("/stats", async (_req, res) => {
  const [contacts, messages, blocked, humanTakeover] = await Promise.all([
    prisma.contact.count(),
    prisma.message.count(),
    prisma.contact.count({ where: { isBlocked: true } }),
    prisma.contact.count({ where: { isHumanTakeover: true } })
  ]);
  res.json({ contacts, messages, blocked, humanTakeover });
});

adminRouter.get("/contacts", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const status = String(req.query.status || "all");
  const statusWhere = {
    takeover: { isHumanTakeover: true },
    blocked: { isBlocked: true },
    normal: { isHumanTakeover: false, isBlocked: false }
  }[status];
  const searchWhere = q ? {
    OR: [
      { username: { contains: q, mode: "insensitive" } },
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { telegramUserId: { contains: q } },
      { tag: { contains: q, mode: "insensitive" } }
    ]
  } : undefined;
  const contacts = await prisma.contact.findMany({
    where: {
      ...(statusWhere || {}),
      ...(searchWhere || {})
    },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1
      },
      _count: { select: { messages: true } }
    },
    orderBy: { updatedAt: "desc" },
    take: 100
  });
  res.json(contacts);
});

adminRouter.get("/contacts/:id/messages", async (req, res) => {
  const messages = await prisma.message.findMany({
    where: { contactId: req.params.id },
    orderBy: { createdAt: "asc" },
    take: 300
  });
  res.json(messages);
});

adminRouter.delete("/contacts/:id/messages", async (req, res) => {
  const result = await prisma.message.deleteMany({
    where: { contactId: req.params.id }
  });
  res.json({ ok: true, deleted: result.count });
});

adminRouter.delete("/messages", async (_req, res) => {
  const result = await prisma.message.deleteMany({});
  res.json({ ok: true, deleted: result.count });
});

adminRouter.delete("/contacts", async (_req, res) => {
  const messages = await prisma.message.deleteMany({});
  const contacts = await prisma.contact.deleteMany({});
  res.json({ ok: true, deletedContacts: contacts.count, deletedMessages: messages.count });
});

adminRouter.patch("/contacts/:id", async (req, res) => {
  const { tag, note, isBlocked, isHumanTakeover } = req.body;
  const contact = await prisma.contact.update({
    where: { id: req.params.id },
    data: {
      tag,
      note,
      isBlocked,
      isHumanTakeover
    }
  });
  res.json(contact);
});

adminRouter.delete("/contacts/:id", async (req, res) => {
  await prisma.message.deleteMany({ where: { contactId: req.params.id } });
  await prisma.contact.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

adminRouter.post("/contacts/:id/reply", async (req, res) => {
  const text = String(req.body.text || "").trim();
  if (!text) return res.status(400).json({ error: "reply text is required" });

  const contact = await prisma.contact.findUniqueOrThrow({ where: { id: req.params.id } });
  await sendTelegramMessage(contact.telegramChatId || contact.telegramUserId, text, {
    businessConnectionId: contact.businessConnectionId
  });
  const message = await prisma.message.create({
    data: {
      contactId: contact.id,
      direction: "OUTBOUND",
      text
    }
  });
  res.json(message);
});

adminRouter.get("/rules", async (_req, res) => {
  const rules = await prisma.replyRule.findMany({
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }]
  });
  res.json(rules);
});

adminRouter.post("/rules", async (req, res) => {
  const keyword = String(req.body.keyword || "").trim();
  const reply = String(req.body.reply || "").trim();
  if (!keyword || !reply) return res.status(400).json({ error: "keyword and reply are required" });

  const rule = await prisma.replyRule.create({
    data: {
      keyword,
      reply,
      enabled: Boolean(req.body.enabled ?? true),
      priority: Number(req.body.priority || 100)
    }
  });
  res.json(rule);
});

adminRouter.patch("/rules/:id", async (req, res) => {
  const rule = await prisma.replyRule.update({
    where: { id: req.params.id },
    data: {
      keyword: req.body.keyword,
      reply: req.body.reply,
      enabled: req.body.enabled,
      priority: req.body.priority === undefined ? undefined : Number(req.body.priority)
    }
  });
  res.json(rule);
});

adminRouter.delete("/rules/:id", async (req, res) => {
  await prisma.replyRule.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

adminRouter.get("/settings", async (_req, res) => {
  res.json(await getSettingMap(config));
});

adminRouter.put("/settings", async (req, res) => {
  await updateSettings(req.body);
  res.json(await getSettingMap(config));
});

adminRouter.post("/settings/reset", async (_req, res) => {
  await resetSettings();
  res.json(await getSettingMap(config));
});

export function requireAdminAuth(req, res, next) {
  const header = req.header("authorization") || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) return requestAuth(res);

  const [username, password] = Buffer.from(encoded, "base64").toString("utf8").split(":");
  if (username === config.ADMIN_USERNAME && password === config.ADMIN_PASSWORD) {
    return next();
  }

  return requestAuth(res);
}

function requestAuth(res) {
  res.set("WWW-Authenticate", 'Basic realm="Telegram Bot Admin"');
  res.status(401).send("Authentication required");
}
