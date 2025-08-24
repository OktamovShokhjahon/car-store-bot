const mongoose = require("mongoose");

const carApplicationSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true,
  },
  userInfo: {
    telegramId: Number,
    username: String,
    firstName: String,
    lastName: String,
    phoneNumber: String,
  },
  carModel: {
    type: String,
    required: true,
  },
  carYear: {
    type: Number,
    required: true,
  },
  price: {
    type: String,
    required: true,
  },
  mileage: {
    type: String,
    required: true,
  },
  vin: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  images: [
    {
      type: String,
      required: true,
    },
  ],
  status: {
    type: String,
    enum: ["pending", "approved", "declined"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  processedAt: Date,
  processedBy: Number,
});

module.exports = mongoose.model("CarApplication", carApplicationSchema);
