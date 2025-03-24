const { REST, Routes } = require("discord.js");
const fs = require('fs');
const { clientId, guildId, token } = require('../config.json');

module.exports = (client) => {
    client.handleCommands = async (commandFolders, path) => {
        client.commandArray = [];
        for (folder of commandFolders) {
            const commandFiles = fs.readdirSync(`${path}/${folder}`).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {

                const command = require(`../Commands/${folder}/${file}`)
                client.commands.set(command.data.name, command);
                client.commandArray.push(command.data.toJSON());
                //client.commands.set();
                //client.commandArray.push();
            }
        }

        const rest = new REST().setToken(token);

        (async () => {
            try {

                const data = await rest.put(
                    Routes.applicationCommands(clientId), 
                    { body: client.commandArray },
                );

                //console.log(`Successfully reloaded ${data.length} application (/) commands.`);
            } catch (error) {
                console.error(error);
            }
        })();
    };
};