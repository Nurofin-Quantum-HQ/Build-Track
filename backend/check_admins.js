require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/billtrack')
  .then(async () => {
    const admins = await User.find({ role: 'Admin' });
    console.log("ADMINS:");
    admins.forEach(a => console.log(a._id, a.name, a.email));
    process.exit(0);
  });
