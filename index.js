require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
const express = require("express");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const channelLangMap = {
  "1349991324866056244": "vi",
  "1349991508304199844": "en",
  "1381169760045367436": "zh-CN",
};

const translate = async (text, targetLang) => {
  const res = await axios.post(
    "https://translate.googleapis.com/translate_a/single",
    null,
    {
      params: {
        client: "gtx",
        sl: "auto",
        tl: targetLang,
        dt: "t",
        q: text,
      },
    }
  );
  return res.data[0].map((pair) => pair[0]).join(" ");
};

const sendAsWebhook = async (channel, username, avatarURL, content) => {
  try {
    const webhooks = await channel.fetchWebhooks();
    let hook = webhooks.find((h) => h.name === "translator");

    if (!hook) {
      hook = await channel.createWebhook({ name: "translator" });
    }

    await hook.send({
      content,
      username,
      avatarURL,
    });
  } catch (err) {
    console.error("Lỗi gửi webhook:", err.message);
  }
};

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const sourceChannelID = message.channel.id;
  const sourceLang = channelLangMap[sourceChannelID];
  if (!sourceLang) return;

  for (const [targetChannelID, targetLang] of Object.entries(channelLangMap)) {
    if (targetChannelID === sourceChannelID) continue;

    try {
      const translated = await translate(message.content, targetLang);
      const targetChannel = await client.channels.fetch(targetChannelID);
      const username = message.member?.nickname || message.author.username;
      const avatar = message.author.displayAvatarURL();

      await sendAsWebhook(targetChannel, username, avatar, translated);
    } catch (err) {
      console.error("Lỗi dịch:", err.message);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);

// Web server giữ bot sống
const app = express();
app.get("/", (req, res) => res.send("Bot is running"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Web server chạy trên cổng ${PORT}`)
);

// 🔔 Xử lý lỗi toàn cục gửi về Discord
const errorChannelId = "1350011193154211904";

process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
  const channel = client.channels.cache.get(errorChannelId);
  if (channel) {
    const now = new Date().toLocaleString("vi-VN");
    channel.send(`🚨 [${now}] Unhandled Rejection:\n\`\`\`${error.message}\`\`\``);
  }
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  const channel = client.channels.cache.get(errorChannelId);
  if (channel) {
    const now = new Date().toLocaleString("vi-VN");
    channel.send(`🔥 [${now}] Uncaught Exception:\n\`\`\`${error.message}\`\`\``);
  }
});
