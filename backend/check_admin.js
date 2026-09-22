require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/billtrack')
  .then(async () => {
    const admin = await User.findOne({ role: 'Admin' });
    console.log("ADMIN ID:", admin ? admin._id : "NOT FOUND");
    process.exit(0);
  });
