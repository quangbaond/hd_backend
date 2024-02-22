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
        role: {
            type: Boolean,
            default: false
        }
    },
    { collection: "admins" }
);

module.exports = mongoose.model("admins", admins);