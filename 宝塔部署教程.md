# Telegram Business Bot 宝塔部署教程

适用项目：`tg-business-bot-mvp`

部署目标：

```text
Telegram Business
  -> Telegram Bot API Webhook
  -> 宝塔 Nginx HTTPS
  -> Node.js Express 服务
  -> PostgreSQL + Redis
```

## 1. 准备服务器和域名

建议配置：

- 服务器：2 核 2G 起步，Ubuntu 22.04 / Debian 12 / CentOS 7+ 都可以
- 域名：例如 `bot.example.com`
- 宝塔面板：已安装并能登录
- Telegram Bot：已通过 `@BotFather` 创建，并拿到 `BOT_TOKEN`

域名 DNS 添加一条 A 记录：

bot.example.com -> 你的服务器公网 IP

## 2. 宝塔安装基础环境

进入宝塔面板：

1. 打开「软件商店」
2. 安装：
   - Nginx
   - Node.js 版本管理器 / Node 项目管理器
   - PostgreSQL
   - Redis

推荐 Node.js 版本：

Node.js 20 LTS 或 22 LTS

如果你的宝塔没有 PostgreSQL 插件，也可以用 Docker 安装 PostgreSQL 和 Redis，但为了简单，优先用宝塔软件商店安装。

## 3. 上传项目

在宝塔「文件」中新建目录：

/www/wwwroot/tg-business-bot-mvp

把本项目包上传进去

cd /www/wwwroot/tg-business-bot-mvp

安装依赖：

bash
npm install


## 4. 创建 PostgreSQL 数据库

在宝塔 PostgreSQL 管理界面创建：

数据库名：tg_business_bot
用户名：tg_bot
密码：自己生成一个强密码


## 5. 配置 Redis

宝塔 Redis 默认一般监听本机 `127.0.0.1:6379`。

建议：

- Redis 不要开放公网
- 如设置了密码，记得写进 `.env`

## 6. 配置项目环境变量

复制配置文件：

编辑 `.env`：

PORT=3000
PUBLIC_BASE_URL=https://你的域名

TELEGRAM_BOT_TOKEN=你的机器人 API Key
TELEGRAM_WEBHOOK_SECRET=自己生成一个32位长随机字符串

DATABASE_URL=postgresql://tg_bot:你的PostgreSQL密码@127.0.0.1:5432/tg_business_bot?schema=public
REDIS_URL=redis://127.0.0.1:6379

# mock / openai / zhipu
AI_PROVIDER=这里填AI厂商如 zhipu
AI_CONTEXT_LIMIT=长上下记忆默认：10

OPENAI_API_KEY=你的GPT API Key
OPENAI_MODEL=使用模型如 gpt-4.1-mini

ZHIPU_API_KEY=你的智谱 API Key
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4/
ZHIPU_MODEL=使用模型如 glm-4.7
ZHIPU_VISION_MODEL=视觉模型如 glm-4.6v 识别TG聊天用户发送的图片识别
AI_VISION_ENABLED=true

AI_PERSONA=你是一个说话自然、简洁的普通聊天朋友，不扮演客服。
AI_PRODUCT_INFO=只回应用户当前说的话，不主动延伸话题。默认只回复一句，最多两句。用户说得短，你也要回得短。没有必要时不要追问。
AI_PRICE_RULES=不要虚构现实经历、身体状态或真实记忆。不要说“我会一直陪你”“我只想陪你”等依赖性话语。不要重复用户的话，也不要强行关心用户。
AI_REPLY_STYLE=口语化、直接、像真人发消息。每次尽量不超过15个字。不写小作文，不说套话，不频繁使用“哈哈、呀、呢”。
AI_FALLBACK_REPLY=没太看懂，你换个说法。


ADMIN_USERNAME=后台用户名
ADMIN_PASSWORD=后台密码

## 7. 初始化数据库

在项目目录执行：

bash
npm run db:generate
npm run db:migrate


如果迁移成功，会生成 `Contact`、`Message`、`ReplyRule` 等表。

## 8. 用 PM2 / Node 项目管理器启动

### 宝塔 Node 项目管理器

进入宝塔：

1. 网站
2. Node 项目
3. 添加 Node 项目
4. 项目目录选择：

/www/wwwroot/tg-business-bot-mvp

启动文件：

src/server.js

包管理器：

npm

## 9. 创建站点和 HTTPS

宝塔「网站」中新建站点：

域名：bot.example.com
根目录：/www/wwwroot/tg-business-bot-mvp
PHP：纯静态

然后在站点设置里申请 SSL：

1. SSL
2. Let's Encrypt
3. 申请证书
4. 开启强制 HTTPS

Telegram Webhook 必须使用公网 HTTPS。

## 10. 配置 Nginx 反向代理

宝塔站点设置：

1. 反向代理
2. 添加反向代理
3. 目标 URL：

http://127.0.0.1:3000

发送域名：$host

如果要手写 Nginx 配置，可参考：

location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

保存后重载 Nginx。

# 12. 其他说明

本项目设置 webhook 时会带上 `secret_token`，Telegram 后续请求会携带：

X-Telegram-Bot-Api-Secret-Token

服务端会校验这个 header，防止别人伪造 webhook 请求。

需要开发定制更多功能联系@PHP74

## 13. 绑定 Telegram Business 自动聊天

在 Telegram 手机端：

1. 设置
2. Telegram Business
3. 自动聊天 / Chatbots
4. 输入你的机器人用户名，例如：@your_bot_name
5. 选择机器人可以访问的聊天范围
6. 保存

然后找另一个 Telegram 账号给你的 Business 账号发私聊消息，观察是否自动回复。

## 14. 常见问题

### 1. `/health` 打不开

检查：

bash
pm2 status
pm2 logs tg-business-bot

确认项目监听的是 `.env` 里的 `PORT=3000`。

### 2. Telegram 不回调

确认：

- 域名 HTTPS 正常
- Nginx 反代到了 `127.0.0.1:3000`
- 宝塔防火墙和云安全组开放了 `443`
- 不要把 `.env` 上传到公开仓库
- Redis 和 PostgreSQL 不要开放公网
- 宝塔面板端口改成非默认端口
- 宝塔开启安全入口和强密码
- Telegram Bot Token 泄露后立刻去 `@BotFather` 重置
- Webhook secret 用长随机字符串
- 后续后台管理必须加登录鉴权

## 16. 后台管理地址

https://你的域名/admin