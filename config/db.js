const mongoose = require('mongoose');
require('dotenv').config();

// Hem MONGODB_URI hem MONGO_URI desteklenir
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  throw new Error('.env dosyasında MONGODB_URI veya MONGO_URI tanımlı olmalı.');
}

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Bağlandı!');
  } catch (error) {
    console.error('MongoDB bağlantı hatası:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

