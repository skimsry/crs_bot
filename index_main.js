require('dotenv').config();
const express = require("express");
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

// Express setup for keeping the bot alive
app.get("/", (req, res) => res.send("Bot is running"));
app.listen(PORT, () => console.log("Server running on port", PORT));

// Bot Setup
// WARNING: Do not share your token publicly. Use process.env.BOT_TOKEN in production.
//const token = '8778273567:AAFqZDuEjSkiXsbv2wYmH_8qHOu5UmCQhLM';
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// 1. DATA STRUCTURE (Keep this outside functions)
const MENU_DATA = {
  main: {
    text: "សូមស្វាគមន៍មកកាន់ កម្មវិធីស្វ័យសិក្សា CRS 🎓\n\nសូមជ្រើសរើសមេរៀន ៖",
    buttons: [
      { text: "👶 ការចុះបញ្ជីកំណើតរស់", callback_data: "cat_birth" },
      { text: "🕯️ ការចុះបញ្ជីមរណភាព", callback_data: "cat_death" },
      { text: "👩‍❤️‍👨 ការចុះបញ្ជីអាពាហ៍ពិពាហ៍", callback_data: "cat_marriage" }
    ]
  },
  categories: {
    cat_birth: {
      title: "👶 ការចុះបញ្ជីកំណើតរស់\n\nសូមជ្រើសរើសវីដេអូដើម្បីស្វ័យសិក្សា៖",
      videos: [
        { id: "v1", text: "១. ស្នើសុំចុះបញ្ជីកំណើតរស់", url: "https://youtu.be/b-6XDxyI-JE" },
        { id: "v2", text: "២. ស្នើសុំសេចក្តីចម្លងសំបុត្រកំណើត", url: "https://youtu.be/0lWBzBZ_U6o" }
      ]
    },
    cat_death: {
      title: "🕯️ ការចុះបញ្ជីមរណភាព\n\nសូមជ្រើសរើសវីដេអូដើម្បីស្វ័យសិក្សា៖",
      videos: [
        { id: "v3", text: "១. ការរាយការណ៍មរណភាព", url: "https://link-to-video.com" }
      ]
    },
    cat_marriage: {
      title: "👩‍❤️‍👨 ការចុះបញ្ជីអាពាហ៍ពិពាហ៍\n\nសូមជ្រើសរើសវីដេអូដើម្បីស្វ័យសិក្សា៖",
      videos: [
        { id: "v4", text: "១. ការចុះសំបុត្រអាពាហ៍ពិពាហ៍", url: "https://link-to-video.com" }
      ]
    }
  }
};

const sentVideos = {};

// 2. HELPER FUNCTIONS
function saveMessage(chatId, messageId) {
  if (!sentVideos[chatId]) sentVideos[chatId] = [];
  sentVideos[chatId].push(messageId);
}

function sendMainMenu(chatId, messageId = null) {
  const options = {
    reply_markup: {
      inline_keyboard: MENU_DATA.main.buttons.map(btn => [btn])
    }
  };

  if (messageId) {
    bot.editMessageText(MENU_DATA.main.text, { chat_id: chatId, message_id: messageId, ...options });
  } else {
    bot.sendMessage(chatId, MENU_DATA.main.text, options);
  }
}

// 3. BOT COMMANDS
bot.onText(/\/start/, (msg) => {
  sendMainMenu(msg.chat.id);
});

// 4. CALLBACK HANDLER (Defined once, outside)
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;

  bot.answerCallbackQuery(query.id);

  // Handle Main Menu
  if (data === "back_to_main") {
    return sendMainMenu(chatId, messageId);
  }

  // Handle Category selection
  if (data.startsWith("cat_")) {
    const category = MENU_DATA.categories[data];
    if (category) {
      const buttons = category.videos.map(v => ([{ text: v.text, callback_data: `vid_${data}_${v.id}` }]));
      buttons.push([{ text: "⬅️ ត្រឡប់ក្រោយ", callback_data: "back_to_main" }]);

      bot.editMessageText(category.title, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: buttons }
      });
    }
  }

  // Handle Video selection
  if (data.startsWith("vid_")) {
    const parts = data.split("_"); 
    const catId = parts[1] + "_" + parts[2]; // Reconstruct cat_birth etc.
    const vidId = parts[3];
    
    const video = MENU_DATA.categories[catId]?.videos.find(v => v.id === vidId);

    if (video) {
      const msg = await bot.sendMessage(chatId, `🎥 ${video.text}\n\n${video.url}`, {
        reply_markup: {
          inline_keyboard: [[{ text: "🧹 សម្អាត", callback_data: "clear_links" }]]
        }
      });
      saveMessage(chatId, msg.message_id);
    }
  }

  // Handle Clear
  if (data === "clear_links") {
    try {
      await bot.deleteMessage(chatId, messageId);
    } catch (e) {
      console.log("Delete error: Message might be too old or already deleted.");
    }
  }
});