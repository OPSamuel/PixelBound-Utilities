const { ActivityType } = require("discord.js");
const mongoose = require("mongoose");
const { database } = require("../config.json");

mongoose.set('strictQuery', true); //Clears the annoying mongodb depreciation warning in the console.

module.exports = {
    name: 'ready',
    async execute(client) {
        // Set bot presence
        client.user.setPresence({
            //activities: [{ name: `the server.`, type: ActivityType.Watching }],
            status: 'online',
        });

        // Connect to the database
        try {
            await mongoose.connect(database, {});
            //console.log("✅ Successfully Connected To The Mongoose Database");
        } catch (error) {
            console.error("❌ Failed to connect to the Mongoose Database:", error);
        }

        console.log('PixelBound\'s Utilities is online.');
    },
};