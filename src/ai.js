import OpenAI from "openai";
import { config } from "./config.js";
import { getSettingMap } from "./settings.js";

export async function generateAiReply({ messageText, contact, history = [] }) {
  if (config.AI_PROVIDER === "mock") {
    return `我已收到：${messageText}`;
  }

  const settings = await getSettingMap(config);

  try {
    const { client, model } = createAiClient();
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(settings)
        },
        ...buildHistoryMessages(history),
        {
          role: "user",
          content: messageText
        }
      ]
    });

    return response.choices[0]?.message?.content?.trim() || settings.AI_FALLBACK_REPLY;
  } catch (error) {
    console.error("AI reply failed:", {
      provider: config.AI_PROVIDER,
      status: error.status,
      code: error.code,
      type: error.type,
      message: error.message
    });
    return settings.AI_FALLBACK_REPLY;
  }
}

export async function describeImageWithVision(imageDataUrl) {
  if (!config.AI_VISION_ENABLED || config.AI_PROVIDER !== "zhipu" || !config.ZHIPU_API_KEY) {
    return null;
  }

  try {
    const { client } = createAiClient();
    const response = await client.chat.completions.create({
      model: config.ZHIPU_VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Describe this image briefly in Simplified Chinese. Mention visible objects, text, screenshot UI, and likely user intent. Do not invent details you cannot see."
            },
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl
              }
            }
          ]
        }
      ]
    });

    return response.choices[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error("Vision analysis failed:", {
      provider: config.AI_PROVIDER,
      model: config.ZHIPU_VISION_MODEL,
      status: error.status,
      code: error.code,
      type: error.type,
      message: error.message
    });
    return null;
  }
}

export async function getConversationHistory(prisma, contactId, excludeMessageId) {
  if (config.AI_CONTEXT_LIMIT <= 0) return [];

  const messages = await prisma.message.findMany({
    where: {
      contactId,
      id: excludeMessageId ? { not: excludeMessageId } : undefined
    },
    orderBy: { createdAt: "desc" },
    take: config.AI_CONTEXT_LIMIT
  });

  return messages.reverse();
}

function createAiClient() {
  if (config.AI_PROVIDER === "zhipu") {
    return {
      model: config.ZHIPU_MODEL,
      client: new OpenAI({
        apiKey: config.ZHIPU_API_KEY,
        baseURL: config.ZHIPU_BASE_URL
      })
    };
  }

  return {
    model: config.OPENAI_MODEL,
    client: new OpenAI({
      apiKey: config.OPENAI_API_KEY
    })
  };
}

function buildHistoryMessages(history) {
  return history
    .filter((message) => message.text?.trim())
    .map((message) => ({
      role: message.direction === "OUTBOUND" ? "assistant" : "user",
      content: message.text
    }));
}

function buildSystemPrompt(settings) {
  return [
    settings.AI_PERSONA,
    "",
    "【业务资料】",
    settings.AI_PRODUCT_INFO,
    "",
    "【价格与承诺规则】",
    settings.AI_PRICE_RULES,
    "",
    "【回复风格】",
    settings.AI_REPLY_STYLE,
    "",
    "【上下文规则】",
    "回复必须结合最近聊天上下文。客户说“这个”“多少钱”“多久”“可以吗”等模糊表达时，要根据前文判断指代对象。前文仍不明确时，只追问一句，不要乱猜。",
    "",
    "【媒体消息处理】",
    "如果用户发来图片、贴纸、自定义表情、动图、语音、文件等媒体消息，系统会把它转换成一段文字提示。你要像真人聊天一样自然接话。如果消息里包含 VISION_RESULT，说明图片已经被视觉模型识别过，必须结合识别结果回复，不要再说看不到图片。",
    "",
    "【安全边界】",
    "不要提供攻击、盗号、诈骗、木马、钓鱼、恶意爬取、盗取资产、绕过风控、侵犯隐私等违法违规实现方法。遇到高风险需求，不展开技术细节，只引导到安全检测、防护、修复、合规开发方向。",
    "",
    "【输出要求】",
    "只输出要发给客户的回复内容，不要解释你的思考过程，不要输出标签。"
  ].join("\n");
}
