require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
const User = require('./models/User');
const Project = require('./models/Project');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/billtrack')
  .then(async () => {
    const admin = await User.findOne({ role: 'Admin' });
    
    const query = {};
    const adminProjects = await Project.find({ createdBy: admin._id }).select("_id");
    const adminProjectIds = adminProjects.map((p) => p._id);
    query.$or = [
      { project: { $in: adminProjectIds } },
      { project: null, createdBy: admin._id }
    ];

    const txs = await Transaction.find(query).sort({ createdAt: -1 }).limit(10);
    console.log("FETCHED VIA QUERY:");
    txs.forEach(t => {
      console.log(`ID: ${t._id}, PROJ: ${t.project}, DATE: ${t.date}, AMT: ${t.amount}, CREATED: ${t.createdAt}`);
    });
    process.exit(0);
  });
