const mongoose = require("mongoose");

const Schema = mongoose.Schema;

let admins = new Schema(
    {
        username: {
            type: String
        },
        password: {
            type: String
        },
    },
    { collection: "admins" }
);

module.exports = mongoose.model("admins", admins);