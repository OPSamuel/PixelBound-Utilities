const { model, Schema } = require("mongoose");

module.exports = model(
    "Counting",
    new Schema({
        Guild_Name: String,
        Guild_ID: String,
        Channel_ID: String,
        Channel_Name: String,
        CurrentCount: { type: Number, default: 0 },
        NextCount: { type: Number, default: 1 },
        LastUser_ID: String,
        LastUser_Name: String,
        SetBy: String,
        SetAt: { type: Date, default: Date.now }
    })
);