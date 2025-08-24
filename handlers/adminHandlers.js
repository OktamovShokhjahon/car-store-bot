const User = require("../models/User");
const CarApplication = require("../models/CarApplication");
const {
  createAdminMainKeyboard,
  createApplicationActionKeyboard,
  createBroadcastKeyboard,
} = require("../utils/keyboards");

class AdminHandlers {
  constructor(bot) {
    this.bot = bot;
    this.adminStates = new Map();
    this.tempData = new Map();
  }

  async handleAdminCommand(msg) {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === "/admin") {
      this.adminStates.set(chatId, "waiting_password");
      await this.bot.sendMessage(chatId, "🔐 Введите пароль администратора:");
      return;
    }

    const state = this.adminStates.get(chatId);
    if (state === "waiting_password") {
      if (text === process.env.ADMIN_PASSWORD) {
        this.adminStates.delete(chatId);
        await this.showAdminPanel(chatId);
      } else {
        await this.bot.sendMessage(
          chatId,
          "❌ Неверный пароль. Попробуйте снова или отправьте /admin для начала."
        );
      }
    }
  }

  async showAdminPanel(chatId) {
    const message = `🔐 Панель администратора

Выберите действие:`;

    await this.bot.sendMessage(chatId, message, createAdminMainKeyboard());
  }

  async handleAdminCallback(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    try {
      switch (data) {
        case "admin_users":
          await this.showUsersList(chatId);
          break;
        case "admin_applications":
          await this.showApplicationsList(chatId);
          break;
        case "admin_broadcast":
          await this.showBroadcastOptions(chatId);
          break;
        case "admin_main":
          await this.showAdminPanel(chatId);
          break;
        default:
          if (data.startsWith("approve_")) {
            await this.approveApplication(chatId, data.split("_")[1]);
          } else if (data.startsWith("decline_")) {
            await this.declineApplication(chatId, data.split("_")[1]);
          } else if (data.startsWith("show_app_")) {
            await this.showApplicationDetails(chatId, data.split("_")[2]);
          } else if (data.startsWith("broadcast_")) {
            await this.handleBroadcastType(chatId, data.split("_")[1]);
          }
          break;
      }
    } catch (error) {
      console.error("Error in admin callback:", error);
      await this.bot.sendMessage(
        chatId,
        "❌ Произошла ошибка. Попробуйте позже."
      );
    }
  }

  async showUsersList(chatId) {
    try {
      const totalUsers = await User.countDocuments();

      const message = `👥 Статистика пользователей\n\nВсего пользователей: ${totalUsers}`;

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            // [
            //   {
            //     text: "📢 Отправить сообщение всем",
            //     callback_data: "admin_broadcast",
            //   },
            // ],
            [{ text: "🔙 Назад", callback_data: "admin_main" }],
          ],
        },
      };

      await this.bot.sendMessage(chatId, message, keyboard);
    } catch (error) {
      console.error("Error showing users:", error);
      await this.bot.sendMessage(
        chatId,
        "❌ Ошибка при загрузке статистики пользователей."
      );
    }
  }

  async showApplicationsList(chatId) {
    try {
      const pendingApps = await CarApplication.find({ status: "pending" }).sort(
        { createdAt: -1 }
      );

      if (pendingApps.length === 0) {
        await this.bot.sendMessage(chatId, "📝 Нет заявок на рассмотрение.", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔙 Назад", callback_data: "admin_main" }],
            ],
          },
        });
        return;
      }

      let message = `📝 Заявки на рассмотрение: ${pendingApps.length}\n\n`;

      pendingApps.forEach((app, index) => {
        message += `${index + 1}. ${app.carModel} ${app.carYear}\n`;
        message += `   Цена: ${app.price}\n`;
        message += `   Место: ${app.location}\n`;
        message += `   Дата: ${app.createdAt.toLocaleDateString("ru-RU")}\n\n`;
      });

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📋 Просмотреть первую заявку",
                callback_data: `show_app_${pendingApps[0]._id}`,
              },
            ],
            [{ text: "🔙 Назад", callback_data: "admin_main" }],
          ],
        },
      };

      await this.bot.sendMessage(chatId, message, keyboard);
    } catch (error) {
      console.error("Error showing applications:", error);
      await this.bot.sendMessage(
        chatId,
        "❌ Ошибка при загрузке списка заявок."
      );
    }
  }

  async showApplicationDetails(chatId, applicationId) {
    try {
      const application = await CarApplication.findById(applicationId);
      if (!application) {
        await this.bot.sendMessage(chatId, "❌ Заявка не найдена.");
        return;
      }

      const message =
        `📋 Детали заявки #${application._id}\n\n` +
        `📸 Фото: ${application.images.length} шт.\n` +
        `🚗 Марка/модель: ${application.carModel}\n` +
        `💰 Цена: ${application.price}\n` +
        `📅 Год: ${application.carYear}\n` +
        `🛣️ Пробег: ${application.mileage}\n` +
        `🔑 VIN: ${application.vin}\n` +
        `📱 Номер телефона: ${application.phoneNumber}\n` +
        `🌍 Место продажи: ${application.location}\n` +
        `📝 Описание: ${application.description}\n\n` +
        `👤 Пользователь: ${application.userInfo.firstName} ${application.userInfo.lastName}\n` +
        `📱 Username: @${application.userInfo.username || "Не указан"}\n` +
        `📅 Дата подачи: ${application.createdAt.toLocaleDateString("ru-RU")}`;

      // Send images if available
      if (application.images.length > 0) {
        const media = application.images.map((imageId) => ({
          type: "photo",
          media: imageId,
        }));

        await this.bot.sendMediaGroup(chatId, media);
      }

      // Send application details with action buttons
      await this.bot.sendMessage(
        chatId,
        message,
        createApplicationActionKeyboard(application._id)
      );
    } catch (error) {
      console.error("Error showing application details:", error);
      await this.bot.sendMessage(
        chatId,
        "❌ Ошибка при загрузке деталей заявки."
      );
    }
  }

  async approveApplication(chatId, applicationId) {
    try {
      const application = await CarApplication.findById(applicationId);
      if (!application) {
        await this.bot.sendMessage(chatId, "❌ Заявка не найдена.");
        return;
      }

      // Update status
      application.status = "approved";
      application.processedAt = new Date();
      application.processedBy = chatId;
      await application.save();

      // Send to channel
      await this.sendToChannel(application);

      // Notify user that their application was approved
      try {
        const userMessage = `🚗 <b>Модель:</b> ${application.carModel}
📅 <b>Год выпуска:</b> ${application.carYear}
💰 <b>Цена:</b> ${application.price}₽ под ключ 🔑
📊 <b>Пробег:</b> ${application.mileage}
🆔 <b>VIN:</b> ${application.vin}
📍 <b>Локация:</b> ${application.location}

📱 <b>Контакты для связи:</b> ${application.phoneNumber || "Не указан"}

📝 <b>Описание:</b> ${application.description || "Нет описания"}`;

        await this.bot.sendMessage(application.userId, userMessage, {
          parse_mode: "HTML",
        });
      } catch (notifyError) {
        console.error("Error notifying user:", notifyError);
      }

      await this.bot.sendMessage(
        chatId,
        "✅ Заявка одобрена и отправлена в канал!",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔙 К заявкам", callback_data: "admin_applications" }],
            ],
          },
        }
      );
    } catch (error) {
      console.error("Error approving application:", error);
      await this.bot.sendMessage(chatId, "❌ Ошибка при одобрении заявки.");
    }
  }

  async declineApplication(chatId, applicationId) {
    try {
      const application = await CarApplication.findById(applicationId);
      if (!application) {
        await this.bot.sendMessage(chatId, "❌ Заявка не найдена.");
        return;
      }

      // Update status
      application.status = "declined";
      application.processedAt = new Date();
      application.processedBy = chatId;
      await application.save();

      // Notify user that their application was declined
      try {
        const userMessage = `🚗 <b>Модель:</b> ${application.carModel}
📅 <b>Год выпуска:</b> ${application.carYear}
💰 <b>Цена:</b> ${application.price}₽ под ключ 🔑
📊 <b>Пробег:</b> ${application.mileage}
🆔 <b>VIN:</b> ${application.vin}
📍 <b>Локация:</b> ${application.location}

📱 <b>Контакты для связи:</b> ${application.phoneNumber || "Не указан"}

📝 <b>Описание:</b> ${application.description || "Нет описания"}`;

        await this.bot.sendMessage(application.userId, userMessage, {
          parse_mode: "HTML",
        });
      } catch (notifyError) {
        console.error("Error notifying user:", notifyError);
      }

      await this.bot.sendMessage(chatId, "❌ Заявка отклонена и удалена!", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 К заявкам", callback_data: "admin_applications" }],
          ],
        },
      });
    } catch (error) {
      console.error("Error declining application:", error);
      await this.bot.sendMessage(chatId, "❌ Ошибка при отклонении заявки.");
    }
  }

  async sendToChannel(application) {
    console.log(application);

    try {
      const message = `🚗 <b>Модель:</b> ${application.carModel}
📅 <b>Год выпуска:</b> ${application.carYear}
💰 <b>Цена:</b> ${application.price}₽ под ключ 🔑
📊 <b>Пробег:</b> ${application.mileage}
🆔 <b>VIN:</b> ${application.vin}
📍 <b>Локация:</b> ${application.location}

📱 <b>Контакты для связи:</b> ${application.phoneNumber || "Не указан"}

📝 <b>Описание:</b> ${application.description || "Нет описания"}`;

      // ❗️Компания Антон Бай — найдите нас в любых соцсетях, Яндекс и Google❗️

      // Звонки принимаем на 📱 WhatsApp!

      // 📱 Новые авто: 👇🏼
      // +79648544544 Гор (WhatsApp)

      // Мои соцсети 👇 жми, смотри!
      // ❗️79648544544

      // <a href="https://www.instagram.com/anton_buy">📱 Мой инстаграм</a>
      // <a href="https://www.youtube.com/@anton_buy/videos">📱 Ютуб канал</a>
      // <a href="https://vk.com/id872907521">📱 VK Видео</a>
      // <a href="https://rutube.ru/channel/30036367/">📱 Рутуб канал</a>
      // <a href="https://dzen.ru/id/63c572dcdb199e399482d15f">📱 Яндекс Дзен</a>
      // <a href="https://www.tiktok.com/@anton_buy?_t=8on6ZBBN1Ri&_r=1">📱 TikTok</a>
      // <a href="http://antonbuyauto.ru/">📱 Наш сайт</a>
      // <a href="https://t.me/anton_buy_usa">📱 Америка</a>
      // <a href="https://t.me/Anton_Buy_auto_Canada">📱 Канада</a>
      // <a href="https://t.me/antonbuy">📱 Новые авто</a>
      // <a href="https://t.me/antonbuysprobegom">📱 Авто с пробегом</a>

      // <b>ОСТОРОЖНО!</b>

      // <b>ЕСЛИ С ВАМИ СВЯЗЫВАЮТСЯ НЕ С НОМЕРОВ УКАЗАННЫХ ВЫШЕ, ВАС ХОТЯТ ОБМАНУТЬ!</b>

      if (application.images.length > 0) {
        const media = application.images.map((imageId, idx) => {
          // Only the first photo gets the caption
          if (idx === 0) {
            return {
              type: "photo",
              media: imageId,
              caption: message,
              parse_mode: "HTML",
            };
          } else {
            return {
              type: "photo",
              media: imageId,
            };
          }
        });

        await this.bot.sendMediaGroup(process.env.CHANNEL_ID, media);
      } else {
        await this.bot.sendMessage(process.env.CHANNEL_ID, message, {
          parse_mode: "HTML",
        });
      }
    } catch (error) {
      console.error("Error sending to channel:", error);
      throw error;
    }
  }

  async showBroadcastOptions(chatId) {
    await this.bot.sendMessage(
      chatId,
      "📢 Выберите тип рассылки:",
      createBroadcastKeyboard()
    );
  }

  async handleBroadcastType(chatId, type) {
    this.adminStates.set(chatId, `broadcast_${type}`);

    let message = "";
    switch (type) {
      case "text":
        message = "📝 Введите текст сообщения для рассылки всем пользователям:";
        break;
      case "image":
        message = "🖼️ Отправьте изображение для рассылки:";
        break;
      case "video":
        message = "📹 Отправьте видео для рассылки:";
        break;
    }

    await this.bot.sendMessage(chatId, message);
  }

  async handleBroadcastMessage(msg) {
    const chatId = msg.chat.id;
    const state = this.adminStates.get(chatId);

    if (!state || !state.startsWith("broadcast_")) return;

    const type = state.split("_")[1];
    this.adminStates.delete(chatId);

    try {
      const users = await User.find();
      let successCount = 0;
      let failCount = 0;

      for (const user of users) {
        try {
          switch (type) {
            case "text":
              await this.bot.sendMessage(user.telegramId, msg.text);
              break;
            case "image":
              await this.bot.sendPhoto(
                user.telegramId,
                msg.photo[msg.photo.length - 1].file_id
              );
              break;
            case "video":
              await this.bot.sendVideo(user.telegramId, msg.video.file_id);
              break;
          }
          successCount++;
        } catch (error) {
          failCount++;
          console.error(`Failed to send to user ${user.telegramId}:`, error);
        }
      }

      const resultMessage =
        `📢 Рассылка завершена!\n\n` +
        `✅ Успешно отправлено: ${successCount}\n` +
        `❌ Ошибок: ${failCount}`;

      await this.bot.sendMessage(chatId, resultMessage, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 В админ панель", callback_data: "admin_main" }],
          ],
        },
      });
    } catch (error) {
      console.error("Error in broadcast:", error);
      await this.bot.sendMessage(chatId, "❌ Ошибка при рассылке сообщений.");
    }
  }
}

module.exports = AdminHandlers;
