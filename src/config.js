import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  PUBLIC_BASE_URL: z.string().url().optional(),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(12),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),

  AI_PROVIDER: z.enum(["mock", "openai", "zhipu"]).default("mock"),
  AI_CONTEXT_LIMIT: z.coerce.number().int().min(0).max(30).default(10),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  ZHIPU_API_KEY: z.string().optional(),
  ZHIPU_BASE_URL: z.string().url().default("https://open.bigmodel.cn/api/paas/v4/"),
  ZHIPU_MODEL: z.string().default("glm-4.7-flash"),
  ZHIPU_VISION_MODEL: z.string().default("glm-4.5v"),
  AI_VISION_ENABLED: z.preprocess((value) => {
    if (value === undefined) return true;
    return value === true || value === "true" || value === "1";
  }, z.boolean()).default(true),

  AI_PERSONA: z.string().optional(),
  AI_PRODUCT_INFO: z.string().optional(),
  AI_PRICE_RULES: z.string().optional(),
  AI_REPLY_STYLE: z.string().optional(),
  AI_FALLBACK_REPLY: z.string().default("我已收到您的消息，稍后为您处理。"),

  ADMIN_USERNAME: z.string().default("admin"),
  ADMIN_PASSWORD: z.string().default("change-me")
});

export const config = envSchema.parse(process.env);
