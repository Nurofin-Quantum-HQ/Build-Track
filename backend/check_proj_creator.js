require('dotenv').config();
const mongoose = require('mongoose');
const Project = require('./models/Project');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/billtrack')
  .then(async () => {
    const proj = await Project.findById("6aa8d2c7fa2093db1e761775");
    console.log("PROJECT CREATED BY:", proj ? proj.createdBy : "NOT FOUND");
    process.exit(0);
  });
