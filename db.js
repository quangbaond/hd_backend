const mongoose = require("mongoose");

var uri = "mongodb://localhost:27017/hdbank";

mongoose.connect(uri, { useUnifiedTopology: true, useNewUrlParser: true });

const connection = mongoose.connection;

module.exports = connection;