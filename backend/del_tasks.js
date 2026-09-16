const mongoose = require("mongoose");
const Task = require("./models/Task");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/buildtrack")
  .then(async () => {
    const res = await Task.deleteMany({
      title: { $in: ["Foundation Reinforcement checking", "Brickwork plastering inspections"] }
    });
    console.log("Deleted dummy tasks:", res.deletedCount);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
