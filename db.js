require("dotenv").config();
const mongoose = require("mongoose");

var uri = process.env.MONGODB_URI || "mongodb://userAdmin:baooibao1@202.92.6.135:27017/hd";

mongoose.connect(uri).then(() => {

}).catch((err) => { console.error(err); })

const connection = mongoose.connection;

module.exports = connection;