const { ActivityType } = require("discord.js");
const mongoose = require("mongoose");
const { database } = require("../../config.json");
const statuses = require("../../data/specialpresence");

mongoose.set('strictQuery', true);

module.exports = {
    name: 'ready',
    async execute(client) {
        // Database connection
        try {
            await mongoose.connect(database, {});
            console.log("✅ Database connected");
        } catch (error) {
            console.error("❌ Database connection failed:", error);
        }

        console.log(`${client.user.tag} is online.`);

        // Status rotation system
        let previousIndex = -1;
        
        const updateStatus = () => {
            try {
                let currentIndex;
                do {
                    currentIndex = Math.floor(Math.random() * statuses.length);
                } while (currentIndex === previousIndex && statuses.length > 1);
                
                previousIndex = currentIndex;
                const status = statuses[currentIndex];
                
                client.user.setPresence({
                    activities: [{
                        name: status.text,
                        type: status.customType || ActivityType[status.type]
                    }],
                    status: 'online'
                });
                
            } catch (error) {
                console.error("Status update error:", error);
                client.user.setPresence({
                    activities: [{
                        name: "PixelBound Utilities",
                        type: ActivityType.Watching
                    }],
                    status: 'online'
                });
            }
        };

        updateStatus();
        const rotationInterval = setInterval(updateStatus, 10000);
        
        client.once('disconnect', () => clearInterval(rotationInterval));
    }
};