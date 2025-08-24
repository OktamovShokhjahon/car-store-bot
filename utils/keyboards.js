const TelegramBot = require("node-telegram-bot-api");

const createMainMenuKeyboard = () => {
  return {
    reply_markup: {
      keyboard: [
        ["🚗 Отправить заявку на продажу"],
        ["📞 Связаться с поддержкой"],
      ],
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  };
};

const createAdminMainKeyboard = () => {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "👥 Пользователи", callback_data: "admin_users" }],
        [{ text: "📝 Заявки", callback_data: "admin_applications" }],
        // [
        //   {
        //     text: "📢 Отправить сообщение всем",
        //     callback_data: "admin_broadcast",
        //   },
        // ],
      ],
    },
  };
};

const createApplicationActionKeyboard = (applicationId) => {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Одобрить", callback_data: `approve_${applicationId}` },
          { text: "❌ Отклонить", callback_data: `decline_${applicationId}` },
        ],
      ],
    },
  };
};

const createApplicationReviewKeyboard = () => {
  return {
    reply_markup: {
      keyboard: [["✅ Отправить на проверку"], ["❌ Отменить"]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  };
};

const createBroadcastKeyboard = () => {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📝 Текст", callback_data: "broadcast_text" }],
        [{ text: "🖼️ С изображением", callback_data: "broadcast_image" }],
        [{ text: "📹 С видео", callback_data: "broadcast_video" }],
        [{ text: "🔙 Назад", callback_data: "admin_main" }],
      ],
    },
  };
};

const createCancelKeyboard = () => {
  return {
    reply_markup: {
      keyboard: [["❌ Отмена"]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  };
};

module.exports = {
  createMainMenuKeyboard,
  createAdminMainKeyboard,
  createApplicationActionKeyboard,
  createApplicationReviewKeyboard,
  createBroadcastKeyboard,
  createCancelKeyboard,
};
