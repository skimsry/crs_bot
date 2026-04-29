const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot is running");
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
const TelegramBot = require('node-telegram-bot-api');


//const token = '8778273567:AAFqZDuEjSkiXsbv2wYmH_8qHOu5UmCQhLM';
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// store sent video messages per chat
const sentVideos = {};

// ===== MAIN MENU =====
bot.onText(/\/start/, (msg) => {
  sendMainMenu(msg.chat.id);
});

function sendMainMenu(chatId, messageId = null) {
  const text = "សូមស្វាគមន៍មកកាន់ កម្មវិធីស្វ័យសិក្សា CRS 🎓\n\nសូមជ្រើសរើសមេរៀន ៖";

  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "👶 ការចុះបញ្ជីកំណើតរស់", callback_data: "menu_birth" }],
        [{ text: "🕯️ ការចុះបញ្ជីមរណភាព", callback_data: "menu_death" }],
        [{ text: "👩‍❤️‍👨 ការចុះបញ្ជីអាពាហ៍ពិពាហ៍", callback_data: "menu_marriage" }]
      ]
    }
  };

  if (messageId) {
    bot.editMessageText(text, { chat_id: chatId, message_id: messageId, ...options });
  } else {
    bot.sendMessage(chatId, text, options);
  }
}

// ===== CALLBACK =====
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;

  bot.answerCallbackQuery(query.id);

  // MENU
  if (data === "menu_birth") {
    bot.editMessageText("📂 ការចុះបញ្ជីកំណើតរស់\n\nសូមជ្រើសរើសវីដេអូដើម្បីស្វ័យសិក្សា៖", {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: "១. ស្នើសុំចុះបញ្ជីកំណើតរស់", callback_data: "video_1_1" }],
          [{ text: "២. ស្នើសុំសេចក្តីចម្លងសំបុត្រកំណើត", callback_data: "video_1_2" }],
          [{ text: "⬅️ ត្រឡប់ក្រោយ", callback_data: "back_to_main" }]
        ]
      }
    });
  }

  // ===== SEND VIDEO 1 =====
  if (data === "video_1_1") {
    const msg = await bot.sendMessage(
      chatId,
      "🎥 ១. ស្នើសុំចុះបញ្ជីកំណើតរស់\n\nhttps://youtu.be/b-6XDxyI-JE?si=q5zVWr2e7nwAKilo",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🧹 សម្អាត", callback_data: "clear_links" }]
          ]
        }
      }
    );

    saveMessage(chatId, msg.message_id);
  }

  // ===== SEND VIDEO 2 =====
  if (data === "video_1_2") {
    const msg = await bot.sendMessage(
      chatId,
      "🎥 ២. ស្នើសុំសេចក្តីចម្លងសំបុត្រកំណើត\n\nhttps://youtu.be/0lWBzBZ_U6o?si=t6pm-HJ2kiauZ8qf",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🧹 សម្អាត", callback_data: "clear_links" }]
          ]
        }
      }
    );

    saveMessage(chatId, msg.message_id);
  }

  // ===== CLEAR BUTTON =====
  if (data === "clear_links") {
    try {
      await bot.deleteMessage(chatId, messageId);
      // remove from sentVideos
      if (sentVideos[chatId]) {
        sentVideos[chatId] = sentVideos[chatId].filter(id => id !== messageId);
      }
    } catch (e) {
      console.log("Delete error:", e.message);
    }
  }

  // BACK
  if (data === "back_to_main") {
    sendMainMenu(chatId, messageId);
  }
});

// helper
function saveMessage(chatId, messageId) {
  if (!sentVideos[chatId]) {
    sentVideos[chatId] = [];
  }
  sentVideos[chatId].push(messageId);
}