require("dotenv").config();
const mongoose = require("mongoose");

var uri = process.env.MONGODB_URI;

mongoose.connect(uri);

const connection = mongoose.connection;

module.exports = connection;