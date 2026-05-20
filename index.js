require('dotenv').config();
const express = require("express");
const path = require('path');

const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const Menu = require('./models/Menu'); // Import the model

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
const PORT = process.env.PORT || 3000;


// ... under your Express setup
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true })); // To parse form data
const sendSwal = (res, icon, title, text, redirectUrl = "/admin") => {
    return res.send(`
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
        <script>
            window.onload = function() {
                Swal.fire({
                    icon: '${icon}',
                    title: '${title}',
                    text: '${text}',
                    confirmButtonColor: '#3085d6'
                }).then(() => { window.location.href = '${redirectUrl}'; });
            };
        </script>
    `);
};
// Route to show the Admin UI
// 1. Get Admin Page (No changes needed, but kept for context)
app.get("/admin", async (req, res) => {
    try {
        const categories = await Menu.find({});
        res.render("admin", { categories });
    } catch (err) {
        res.status(500).send("Error loading admin page");
    }
});

app.post("/admin/add-category", async (req, res) => {
    const { _id, key, button_text, title } = req.body;

    try {
        let isNew = false;

        // Check if _id is provided and is a valid 24-character hex string
        if (_id && _id.trim() !== "" && _id.length === 24) {
            // Case 1: EDIT existing record
            await Menu.updateOne(
                { _id: _id },
                { $set: { key, button_text, title } }
            );
            isNew = false;
        } else {
            // Case 2: ADD NEW record (Mongoose will auto-generate the _id)
            const newCategory = new Menu({ key, button_text, title });
            await newCategory.save();
            isNew = true;
        }

        // Logic for SweetAlert
        const alertTitle = isNew ? "Category Created!" : "Category Updated!";
        const alertText = isNew ? "A new record has been successfully added." : "Your changes have been saved.";

        res.send(`
            <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
            <script>
                window.onload = function() {
                    Swal.fire({
                        title: '${alertTitle}',
                        text: '${alertText}',
                        icon: 'success',
                        confirmButtonColor: '#3085d6',
                        confirmButtonText: 'Great!'
                    }).then((result) => {
                        window.location = '/admin';
                    });
                };
            </script>
        `);
    } catch (err) {
        console.error("Operation Error:", err);
        res.status(500).send("Error: " + err.message);
    }
});

// 3. Delete Category
app.post("/admin/delete-category", async (req, res) => {
    const { _id } = req.body;

    // Safety check: Ensure an ID was actually sent
    if (!_id) {
        return res.status(400).send("Error: No ID provided for deletion.");
    }

    try {
        // Deletes the document matching the specific MongoDB HexString _id
        await Menu.deleteOne({ _id: _id });

        // Send the SweetAlert2 success response
        res.send(`
            <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
            <script>
                window.onload = function() {
                    Swal.fire({
                        title: 'Deleted!',
                        text: 'The category has been successfully removed.',
                        icon: 'success', // Changed to success for a positive confirmation
                        confirmButtonColor: '#d33',
                        confirmButtonText: 'OK'
                    }).then((result) => {
                        window.location = '/admin';
                    });
                };
            </script>
        `);
    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).send("Error: " + err.message);
    }
});


// --- UPDATE THE ADD-VIDEO ROUTE ---
app.post("/admin/add-video", async (req, res) => {

    let {
        categoryKey,
        id,
        originalId,
        text,
        url,
        isUpdate,
        order
    } = req.body;

    console.log("ORDER VALUE =", req.body.order);
    console.log("FULL BODY =", req.body);
    // USE ORDER FROM FORM INPUT
    let numericOrder = parseInt(order);

if (!numericOrder || numericOrder < 1) {
    numericOrder = 1;
}

    // DEFAULT IF EMPTY
    if (isNaN(numericOrder) || numericOrder < 1) {
        numericOrder = 1;
    }

    try {

        const menu = await Menu.findOne({ key: categoryKey });

        if (!menu) {
            return res.send("Category not found: " + categoryKey);
        }

        // ===================================
        // UPDATE VIDEO
        // ===================================
        if (isUpdate === "true") {

            const videoIndex = menu.videos.findIndex(
                v => v.id === originalId
            );

            if (videoIndex === -1) {
                return res.send("Video not found");
            }

            // CHECK DUPLICATE ID
            const duplicate = menu.videos.find(
                v => v.id === id && v.id !== originalId
            );

            if (duplicate) {
                return sendSwal(
                    res,
                    'error',
                    'Duplicate ID',
                    'This Video ID already exists!'
                );
            }

            // UPDATE VIDEO
            menu.videos[videoIndex].id = id.trim();
            menu.videos[videoIndex].text = text.trim();
            menu.videos[videoIndex].url = url.trim();

            // IMPORTANT
            menu.videos[videoIndex].order = numericOrder;

        } else {

            // ===================================
            // ADD NEW VIDEO
            // ===================================

            const existing = menu.videos.find(
                v => v.id === id
            );

            if (existing) {
                return sendSwal(
                    res,
                    'error',
                    'Duplicate ID',
                    'Video ID already exists!'
                );
            }

            // ADD VIDEO
            menu.videos.push({
                id: id.trim(),
                text: text.trim(),
                url: url.trim(),
                order: numericOrder
            });
        }

        // ===================================
        // SORT BY ORDER
        // ===================================

        menu.videos.sort((a, b) => {
            return a.order - b.order;
        });

        menu.markModified('videos');

        await menu.save();

        return sendSwal(
            res,
            'success',
            'Processed!',
            'Video Processed Successfully!'
        );

    } catch (err) {

        console.error(err);

        return res.status(500).send(
            "Server Error: " + err.message
        );
    }
});



// 5. Delete Video
app.post("/admin/delete-video", async (req, res) => {
    const { categoryKey, videoId } = req.body;
    try {
        await Menu.updateOne(
            { key: categoryKey },
            { $pull: { videos: { id: videoId } } }
        );
        res.send(`
            <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
            <script>
                window.onload = function() {
                    Swal.fire({
                        title: 'Deleted!',
                        text: 'The Lesson Video has been successfully removed.',
                        icon: 'success', // Changed to success for a positive confirmation
                        confirmButtonColor: '#d33',
                        confirmButtonText: 'OK'
                    }).then((result) => {
                        window.location = '/admin';
                    });
                };
            </script>
        `);
    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).send("Error: " + err.message);
    }
});
// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));




const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, {
    polling: {
        interval: 300,
        autoStart: true,
        params: {
            timeout: 10
        }
    }
});
bot.on("polling_error", (err) => {
    console.log("Polling error:", err.message);
});

const sentVideos = {};

// Helper: Save message IDs for cleaning
function saveMessage(chatId, messageId) {
  if (!sentVideos[chatId]) sentVideos[chatId] = [];
  sentVideos[chatId].push(messageId);
}

function leftAlignText(text, targetLength = 40) {
    if (text.length >= targetLength) return text;
    // Uses the Braille Blank space character '⠀' because standard spaces ' ' get trimmed by Telegram
    return text + '⠀'.repeat(targetLength - text.length);
}
// Updated: Fetch Main Menu from DB
async function sendMainMenu(chatId, messageId = null) {
    try {
        const categories = await Menu.find({}, 'key button_text').sort({ key: 1 }); 
        const text = "សូមស្វាគមន៍មកកាន់ កម្មវិធីស្វ័យសិក្សា CRS 🎓\n\nសូមជ្រើសរើសមេរៀន ៖";
        
        // We prefix the key with "cat:" to identify it in the callback_query
        // const buttons = categories.map(cat => [{ 
        //     text: cat.button_text, 
        //     callback_data: `cat:${cat.key}` 
        // }]);
        const buttons = categories.map(cat => [{ 
            text: leftAlignText(cat.button_text, 70), 
            callback_data: `cat:${cat.key}` 
        }]);

        const options = { reply_markup: { 
            inline_keyboard: buttons,
            remove_keyboard: true
        } };

        if (messageId) {
            await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, ...options });
        } else {
            await bot.sendMessage(chatId, text, options);
        }
    } catch (err) {
        console.error("Main Menu Error:", err);
    }
}

bot.onText(/\/start/, (msg) => sendMainMenu(msg.chat.id));

bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;

    bot.answerCallbackQuery(query.id);

    if (data === "back_to_main") return sendMainMenu(chatId, messageId);

    // 2. Handle Category selection
    if (data.startsWith("cat:")) {
    const categoryKey = data.split(":")[1];
    const category = await Menu.findOne({ key: categoryKey });

    if (!category) return;

    const videos = Array.isArray(category.videos)
    ? category.videos
    : [];

// 🔥 USE ORDER FIELD (NOT id)
const sortedVideos = videos
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0));

    const buttons = sortedVideos.map(v => ([
        {
            // text: v.text,
            text: leftAlignText(v.text, 80),
            callback_data: `vid:${categoryKey}|${v.id}`
        }
    ]));

    buttons.push([
        { text: "⬅️ ត្រឡប់ក្រោយ", callback_data: "back_to_main" }
    ]);

    return bot.editMessageText(
        category.title || "សូមជ្រើសរើសវីដេអូ៖",
        {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: { 
                inline_keyboard: buttons
            }
        }
    ).catch(err =>
        console.log("Edit Error:", err.response?.body || err.message)
    );
}

    // 3. Handle Video selection
    if (data.startsWith("vid:")) {
        // Format is vid:categoryKey|videoId
        const content = data.split(":")[1];
        const [catKey, vidId] = content.split("|");

        const category = await Menu.findOne({ key: catKey });
        //const video = category?.videos.find(v => v.id === vidId);
        const video = category?.videos.find(v =>
    String(v.id) === String(vidId)
);

        if (video) {
            const msg = await bot.sendMessage(chatId, `🎥 ${video.text}\n\n${video.url}`, {
                reply_markup: { inline_keyboard: [[{ text: "🧹 សម្អាត", callback_data: "clear_links" }]] }
            });
            saveMessage(chatId, msg.message_id);
        }
    }

    if (data === "clear_links") {
        bot.deleteMessage(chatId, messageId).catch(() => {});
    }
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    
    // Ignore execution commands like /start, otherwise erase manual chatter
    if (msg.text && !msg.text.startsWith('/')) {
        try {
            // Delete the message right away to keep the chat interface clean
            await bot.deleteMessage(chatId, msg.message_id);
            
            // Send a transient flash message reminding them to look up at your CRS course buttons
            const warningAlert = await bot.sendMessage(chatId, "⚠️ សូមជ្រើសរើសមេរៀនដោយប្រើប្រាស់ប៊ូតុងខាងលើ (Please use the menu buttons above).");
            
            // Vaporize the flash message automatically after 3 seconds
            setTimeout(() => {
                bot.deleteMessage(chatId, warningAlert.message_id).catch(() => {});
            }, 3000);
        } catch (err) {
            console.log("Input handler warning:", err.message);
        }
    }
});

app.get("/", (req, res) => res.send("Bot is running"));
app.listen(PORT, () => console.log("Server running on port", PORT));