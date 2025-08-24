const User = require("../models/User");
const CarApplication = require("../models/CarApplication");
const {
  createMainMenuKeyboard,
  createCancelKeyboard,
  createApplicationReviewKeyboard,
} = require("../utils/keyboards");

class UserHandlers {
  constructor(bot) {
    this.bot = bot;
    this.userStates = new Map();
    this.tempData = new Map();
  }

  async handleStart(msg) {
    const chatId = msg.chat.id;
    const user = msg.from;

    try {
      // Save or update user
      await User.findOneAndUpdate(
        { telegramId: user.id },
        {
          telegramId: user.id,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
        },
        { upsert: true, new: true }
      );

      const welcomeMessage = `🚗 Добро пожаловать в бот для продажи автомобилей!

Здесь вы можете:
• Отправить заявку на продажу вашего автомобиля
• Связаться с поддержкой

Выберите действие:`;

      await this.bot.sendMessage(
        chatId,
        welcomeMessage,
        createMainMenuKeyboard()
      );
    } catch (error) {
      console.error("Error in handleStart:", error);
      await this.bot.sendMessage(chatId, "Произошла ошибка. Попробуйте позже.");
    }
  }

  async handleCarApplication(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    this.userStates.set(userId, "waiting_images");
    this.tempData.set(userId, {});

    await this.bot.sendMessage(
      chatId,
      "🖼️ Отправьте фотографии автомобиля (максимум 10). Отправьте /done когда закончите:",
      createCancelKeyboard()
    );
  }

  async handleTextInput(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    if (text === "❌ Отмена") {
      this.userStates.delete(userId);
      this.tempData.delete(userId);
      await this.bot.sendMessage(
        chatId,
        "Действие отменено.",
        createMainMenuKeyboard()
      );
      return;
    }

    const state = this.userStates.get(userId);
    const userData = this.tempData.get(userId) || {};

    if (!state) return;

    switch (state) {
      case "waiting_car_model":
        userData.carModel = text;
        this.userStates.set(userId, "waiting_price");
        this.tempData.set(userId, userData);
        await this.bot.sendMessage(chatId, "💰 Введите цену автомобиля:");
        break;

      case "waiting_price":
        userData.price = text;
        this.userStates.set(userId, "waiting_car_year");
        this.tempData.set(userId, userData);
        await this.bot.sendMessage(
          chatId,
          "📅 Введите год выпуска автомобиля:"
        );
        break;

      case "waiting_car_year":
        const year = parseInt(text);
        if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
          await this.bot.sendMessage(
            chatId,
            "❌ Пожалуйста, введите корректный год (например, 2024):"
          );
          return;
        }
        userData.carYear = year;
        this.userStates.set(userId, "waiting_mileage");
        this.tempData.set(userId, userData);
        await this.bot.sendMessage(chatId, "🛣️ Введите пробег автомобиля:");
        break;

      case "waiting_mileage":
        userData.mileage = text;
        this.userStates.set(userId, "waiting_vin");
        this.tempData.set(userId, userData);
        await this.bot.sendMessage(chatId, "🔑 Введите VIN номер автомобиля:");
        break;

      case "waiting_vin":
        userData.vin = text;
        this.userStates.set(userId, "waiting_phone");
        this.tempData.set(userId, userData);
        await this.bot.sendMessage(
          chatId,
          "📱 Введите номер телефона для связи:"
        );
        break;

      case "waiting_phone":
        userData.phoneNumber = text;
        this.userStates.set(userId, "waiting_location");
        this.tempData.set(userId, userData);
        await this.bot.sendMessage(
          chatId,
          "🌍 Введите место продажи автомобиля:"
        );
        break;

      case "waiting_location":
        userData.location = text;
        this.userStates.set(userId, "waiting_description");
        this.tempData.set(userId, userData);
        await this.bot.sendMessage(chatId, "📝 Введите описание автомобиля:");
        break;

      case "waiting_description":
        userData.description = text;
        // After description, show application review
        await this.showApplicationReview(chatId, userId, userData);
        break;
    }
  }

  async handlePhoto(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const state = this.userStates.get(userId);

    if (state === "waiting_images") {
      const userData = this.tempData.get(userId) || {};
      if (!userData.images) userData.images = [];

      if (userData.images.length >= 10) {
        await this.bot.sendMessage(
          chatId,
          "❌ Максимальное количество фотографий - 10. Отправьте /done для продолжения."
        );
        return;
      }

      const photo = msg.photo[msg.photo.length - 1];
      userData.images.push(photo.file_id);
      this.tempData.set(userId, userData);

      await this.bot.sendMessage(
        chatId,
        `📸 Фотография загружена: ${userData.images.length}/10\n\nОтправьте /done когда закончите или продолжайте отправлять фотографии.`
      );
    }
  }

  async handleDone(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const state = this.userStates.get(userId);

    if (state === "waiting_images") {
      const userData = this.tempData.get(userId) || {};

      if (!userData.images || userData.images.length === 0) {
        await this.bot.sendMessage(
          chatId,
          "❌ Пожалуйста, отправьте хотя бы одну фотографию."
        );
        return;
      }

      // After images are done, ask for car model
      this.userStates.set(userId, "waiting_car_model");
      await this.bot.sendMessage(
        chatId,
        "🚗 Введите марку и модель автомобиля:"
      );
    }
  }

  async showApplicationReview(chatId, userId, userData) {
    try {
      const reviewMessage = `📋 **Проверьте вашу заявку перед отправкой:**

📸 **Фото:** ${userData.images.length} шт.
🚗 **Марка/модель:** ${userData.carModel}
💰 **Цена:** ${userData.price}
📅 **Год:** ${userData.carYear}
🛣️ **Пробег:** ${userData.mileage}
🔑 **VIN:** ${userData.vin}
📱 **Номер телефона:** ${userData.phoneNumber}
🌍 **Место продажи:** ${userData.location}
📝 **Описание:** ${userData.description}

Всё верно? Выберите действие:`;

      // Send images with review message
      if (userData.images.length > 0) {
        const media = userData.images.map((imageId, idx) => {
          // Only the first photo gets the caption
          if (idx === 0) {
            return {
              type: "photo",
              media: imageId,
              caption: reviewMessage,
              parse_mode: "Markdown",
            };
          } else {
            return {
              type: "photo",
              media: imageId,
            };
          }
        });

        await this.bot.sendMediaGroup(chatId, media);
      }

      // Send action buttons
      await this.bot.sendMessage(
        chatId,
        "Выберите действие:",
        createApplicationReviewKeyboard()
      );

      // Set state to waiting for user decision
      this.userStates.set(userId, "waiting_review_decision");
    } catch (error) {
      console.error("Error showing application review:", error);
      await this.bot.sendMessage(
        chatId,
        "❌ Произошла ошибка при показе заявки. Попробуйте позже."
      );
    }
  }

  async handleReviewDecision(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    if (text === "✅ Отправить на проверку") {
      const userData = this.tempData.get(userId);
      if (userData) {
        await this.saveApplication(userId, chatId, userData);
      }
    } else if (text === "❌ Отменить") {
      this.userStates.delete(userId);
      this.tempData.delete(userId);
      await this.bot.sendMessage(
        chatId,
        "❌ Заявка отменена.",
        createMainMenuKeyboard()
      );
    }
  }

  async saveApplication(userId, chatId, userData) {
    try {
      const user = await User.findOne({ telegramId: userId });

      const application = new CarApplication({
        userId: userId,
        userInfo: {
          telegramId: user.telegramId,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
        },
        carModel: userData.carModel,
        carYear: userData.carYear,
        price: userData.price,
        mileage: userData.mileage,
        vin: userData.vin,
        phoneNumber: userData.phoneNumber,
        location: userData.location,
        description: userData.description,
        images: userData.images,
        status: "pending",
      });

      await application.save();

      // Clear user state
      this.userStates.delete(userId);
      this.tempData.delete(userId);

      const successMessage = `✅ Ваша заявка успешно отправлена!

📋 Детали заявки:
📸 Фото: ${userData.images.length} шт.
🚗 Марка/модель: ${userData.carModel}
💰 Цена: ${userData.price}
📅 Год: ${userData.carYear}
🛣️ Пробег: ${userData.mileage}
🔑 VIN: ${userData.vin}
📱 Номер телефона: ${userData.phoneNumber}
🌍 Место продажи: ${userData.location}
📝 Описание: ${userData.description}

Ваша заявка находится на рассмотрении. Мы уведомим вас о решении.`;

      await this.bot.sendMessage(
        chatId,
        successMessage,
        createMainMenuKeyboard()
      );

      // Send application to admin for review
      await this.sendApplicationToAdmin(application);
    } catch (error) {
      console.error("Error saving application:", error);
      await this.bot.sendMessage(
        chatId,
        "❌ Произошла ошибка при сохранении заявки. Попробуйте позже."
      );
    }
  }

  async sendApplicationToAdmin(application) {
    try {
      const adminId = 299720687; // Admin Telegram ID

      const adminMessage = `🚨 НОВАЯ ЗАЯВКА НА РАССМОТРЕНИЕ!

📋 Детали заявки #${application._id}:
📸 Фото: ${application.images.length} шт.
🚗 Марка/модель: ${application.carModel}
💰 Цена: ${application.price}
📅 Год: ${application.carYear}
🛣️ Пробег: ${application.mileage}
🔑 VIN: ${application.vin}
📱 Номер телефона: ${application.phoneNumber}
🌍 Место продажи: ${application.location}
📝 Описание: ${application.description}

👤 Пользователь: ${application.userInfo.firstName} ${
        application.userInfo.lastName
      }
📱 Username: @${application.userInfo.username || "Не указан"}
📅 Дата подачи: ${application.createdAt.toLocaleDateString("ru-RU")}`;

      // Send images if available
      if (application.images.length > 0) {
        const media = application.images.map((imageId, idx) => {
          // Only the first photo gets the caption
          if (idx === 0) {
            return {
              type: "photo",
              media: imageId,
              caption: adminMessage,
            };
          } else {
            return {
              type: "photo",
              media: imageId,
            };
          }
        });

        await this.bot.sendMediaGroup(adminId, media);
      } else {
        await this.bot.sendMessage(adminId, adminMessage);
      }

      // Send approve/decline buttons
      const { createApplicationActionKeyboard } = require("../utils/keyboards");
      await this.bot.sendMessage(
        adminId,
        "Выберите действие:",
        createApplicationActionKeyboard(application._id)
      );
    } catch (error) {
      console.error("Error sending application to admin:", error);
    }
  }

  async handleSupport(msg) {
    const chatId = msg.chat.id;
    await this.bot.sendMessage(
      chatId,
      "📞 Для связи с поддержкой используйте команду /support или напишите нам напрямую."
    );
  }
}

module.exports = UserHandlers;
