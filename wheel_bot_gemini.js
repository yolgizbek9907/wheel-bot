const TelegramBot = require("node-telegram-bot-api");
const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));

const TELEGRAM_TOKEN = "2060986786:AAECpum4pOhYrb0gRJGxL7GTUchWHX_UAEU";
const GEMINI_API_KEY = "AQ.Ab8RN6Kv8bIPHSKV7OGCDpxDvo2OVsADGfhGlGWXHfg5HNDGzw";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
const OWNER_LINK = "https://t.me/wheel_master";

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const userSessions = {};

const SYSTEM_PROMPT = `You are a professional sales assistant for WHEEL TVBET prediction service. Your name is "Wheel Pro Assistant".
YOUR JOB: Have a natural sales conversation, build trust, answer questions, and guide the client toward purchasing. Only send them to the owner WHEN they are 100% ready to pay.
PACKAGES:
- Single prediction: $20 (one-time)
- Weekly subscription: $35/week
- Monthly subscription: $100/month
- Lifetime access: $499 (one-time, best value)
LANGUAGE RULE: Detect the user language and reply in SAME language. Uzbek, Russian, English or French.
SALES STRATEGY:
1. Greet warmly
2. Explain value of predictions
3. Present packages when they show interest
4. Answer objections confidently
5. When client says they want to buy or pay, add CONNECT_OWNER at the very end of your message.
TONE: Professional, confident, friendly. Max 3-4 sentences per reply. Use emojis.`;

async function getGeminiResponse(userId, userMessage) {
  if (!userSessions[userId]) userSessions[userId] = [];
  userSessions[userId].push({ role: "user", parts: [{ text: userMessage }] });
  if (userSessions[userId].length > 20)
    userSessions[userId] = userSessions[userId].slice(-20);
  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: userSessions[userId],
        generationConfig: { maxOutputTokens: 500, temperature: 0.8 },
      }),
    });
    const data = await response.json();
    if (!data.candidates || !data.candidates[0])
      return { text: "Texnik muammo. Qayta yozing.", connect: false };
    const text = data.candidates[0].content.parts[0].text;
    userSessions[userId].push({ role: "model", parts: [{ text }] });
    const connect = text.includes("CONNECT_OWNER");
    return { text: text.replace("CONNECT_OWNER", "").trim(), connect };
  } catch (e) {
    return { text: "Texnik muammo. Qayta yozing.", connect: false };
  }
}

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  userSessions[msg.from.id] = [];
  const { text } = await getGeminiResponse(msg.from.id, "Hello! I just opened the bot. Greet me warmly.");
  await bot.sendMessage(chatId, text, {
    reply_markup: {
      keyboard: [
        ["📊 Narxlar va paketlar", "🏆 Nima uchun biz?"],
        ["📈 Bugungi natijalar", "💬 Menejer bilan bog'lanish"],
      ],
      resize_keyboard: true,
    },
  });
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (!text || text === "/start") return;
  await bot.sendChatAction(chatId, "typing");
  let userInput = text;
  if (text === "📊 Narxlar va paketlar") userInput = "Show me all packages and prices";
  else if (text === "🏆 Nima uchun biz?") userInput = "Why should I trust your predictions?";
  else if (text === "📈 Bugungi natijalar") userInput = "What were your results today?";
  else if (text === "💬 Menejer bilan bog'lanish") userInput = "I want to speak with manager, I am ready to buy";
  const { text: aiText, connect } = await getGeminiResponse(msg.from.id, userInput);
  await bot.sendMessage(chatId, aiText);
  if (connect) {
    setTimeout(async () => {
      await bot.sendMessage(chatId,
        `✅ Zo'r! Sizi menejerimizga ulaymiz!\n\n👤 Menejer: ${OWNER_LINK}\n\nQaysi paketni olmoqchi ekanligingizni ayting! 🚀`,
        { reply_markup: { inline_keyboard: [[{ text: "💬 Menejer bilan bog'lanish", url: OWNER_LINK }]] } }
      );
    }, 1000);
  }
});

console.log("✅ WHEEL TVBET Bot ishga tushdi!");
