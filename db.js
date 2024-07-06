require("dotenv").config();
const mongoose = require("mongoose");

var uri = process.env.MONGODB_URI;

mongoose.connect(uri, { useUnifiedTopology: true, useNewUrlParser: true });

const connection = mongoose.connection;

module.exports = connection;