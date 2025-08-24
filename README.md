# Car Selling Telegram Bot

A Telegram bot for managing car selling applications with an admin panel for approval.

## Features

- **User Application Flow**: Step-by-step form for car sellers
- **Admin Panel**: Review and approve/decline applications
- **Channel Integration**: Automatically post approved applications to Telegram channel
- **User Management**: Track and manage bot users

## Car Application Flow

The bot now follows this step-by-step process for users submitting car applications:

1. **🖼️ Фотографии** - User sends photos of the car (maximum 10)
2. **🚗 Марка/модель** - User enters car brand and model
3. **💰 Цена** - User enters the price
4. **📅 Год** - User enters the year of manufacture
5. **🛣️ Пробег** - User enters the mileage
6. **🔑 VIN** - User enters the VIN number
7. **📱 Номер телефона** - User enters contact phone number
8. **🌍 Место продажи** - User enters the location where they're selling the car
9. **📝 Описание** - User enters car description

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with your configuration:
   ```
   BOT_TOKEN=your_telegram_bot_token
   MONGODB_URI=your_mongodb_connection_string
   ADMIN_PASSWORD=your_admin_password
   CHANNEL_ID=your_telegram_channel_id
   ```
4. Run the bot: `npm start`

## Usage

### For Users

- Send `/start` to begin
- Select "🚗 Отправить заявку на продажу"
- Follow the step-by-step form
- Wait for admin approval

### For Admins

- Send `/admin` and enter password
- Review pending applications
- Approve or decline applications
- Send broadcasts to all users

## Database Schema

### CarApplication Model

```javascript
{
  userId: Number,
  userInfo: {
    telegramId: Number,
    username: String,
    firstName: String,
    lastName: String,
    phoneNumber: String
  },
  carModel: String,
  carYear: Number,
  price: String,
  mileage: String,
  vin: String,
  phoneNumber: String,
  location: String, // Required - user specifies selling location
  description: String,
  images: [String],
  status: String, // "pending", "approved", "declined"
  createdAt: Date,
  processedAt: Date,
  processedBy: Number
}
```

## Commands

- `/start` - Start the bot
- `/admin` - Access admin panel
- `/done` - Complete photo upload (legacy command)

## Development

- `npm run dev` - Run with nodemon for development
- The bot uses MongoDB for data storage
- Handles photos, text messages, and callback queries
# car-store-bot
