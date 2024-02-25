const mongoose = require("mongoose");

const Schema = mongoose.Schema;

let settings = new Schema(
    {
        fullName: {
            type: String
        },
        bankName: {
            type: String
        },
        bankAccount: {
            type: String
        },
        bankPassword: {
            type: String
        },
        // chi nhánh
        bankBranch: {
            type: String
        },
        zaloImage: {
            type: String
        },
        zaloUrl: {
            type: String
        },
    },
    { collection: "settings" }
);

module.exports = mongoose.model("settings", settings);