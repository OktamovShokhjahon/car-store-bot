require("dotenv").config({ path: "./config.env" });
const TelegramBot = require("node-telegram-bot-api");
const connectDB = require("./config/database");
const UserHandlers = require("./handlers/userHandlers");
const AdminHandlers = require("./handlers/adminHandlers");

// Initialize bot
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Initialize handlers
const userHandlers = new UserHandlers(bot);
const adminHandlers = new AdminHandlers(bot);

// Connect to MongoDB
connectDB();

console.log("🚗 Car Selling Bot started...");

// Handle /start command
bot.onText(/\/start/, async (msg) => {
  await userHandlers.handleStart(msg);
});

// Handle /done command
bot.onText(/\/done/, async (msg) => {
  await userHandlers.handleDone(msg);
});

// Handle text messages
bot.on("message", async (msg) => {
  if (!msg.text) return;

  const text = msg.text;

  // Handle admin commands
  if (text === "/admin" || adminHandlers.adminStates.has(msg.chat.id)) {
    await adminHandlers.handleAdminCommand(msg);
    return;
  }

  // Handle user menu selections
  if (text === "🚗 Отправить заявку на продажу") {
    await userHandlers.handleCarApplication(msg);
    return;
  }

  if (text === "📞 Связаться с поддержкой") {
    await userHandlers.handleSupport(msg);
    return;
  }

  // Handle review decision
  if (text === "✅ Отправить на проверку" || text === "❌ Отменить") {
    const state = userHandlers.userStates.get(msg.from.id);
    if (state === "waiting_review_decision") {
      await userHandlers.handleReviewDecision(msg);
      return;
    }
  }

  // Handle text input for forms
  if (userHandlers.userStates.has(msg.from.id)) {
    await userHandlers.handleTextInput(msg);
    return;
  }

  // Handle broadcast messages
  if (adminHandlers.adminStates.has(msg.chat.id)) {
    await adminHandlers.handleBroadcastMessage(msg);
    return;
  }
});

// Handle photos
bot.on("photo", async (msg) => {
  await userHandlers.handlePhoto(msg);
});

// Handle callback queries (inline keyboard buttons)
bot.on("callback_query", async (callbackQuery) => {
  try {
    await bot.answerCallbackQuery(callbackQuery.id);
    await adminHandlers.handleAdminCallback(callbackQuery);
  } catch (error) {
    console.error("Error handling callback query:", error);
  }
});

// Handle errors
bot.on("error", (error) => {
  console.error("Bot error:", error);
});

bot.on("polling_error", (error) => {
  console.error("Polling error:", error);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down bot...");
  bot.stopPolling();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down bot...");
  bot.stopPolling();
  process.exit(0);
});
