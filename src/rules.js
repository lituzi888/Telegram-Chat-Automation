import { prisma } from "./db.js";

const fallbackRules = [
  { keyword: "价格", reply: "您好，您想了解哪一项服务的价格？我可以先帮您登记需求。" },
  { keyword: "人工", reply: "好的，我会为您转接人工客服，请稍等。" },
  { keyword: "hello", reply: "Hello! How can I help you today?" },
  { keyword: "你好", reply: "您好，我在。请问有什么可以帮您？" }
];

export async function findRuleReply(messageText) {
  const dbRules = await prisma.replyRule.findMany({
    where: { enabled: true },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }]
  });

  const rules = dbRules.length > 0 ? dbRules : fallbackRules;
  const normalizedText = messageText.toLowerCase();

  return rules.find((rule) => normalizedText.includes(rule.keyword.toLowerCase()))?.reply;
}
