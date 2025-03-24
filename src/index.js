const { Client, GatewayIntentBits, Collection } = require(`discord.js`);
const fs = require('fs');
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildPresences, 
        GatewayIntentBits.DirectMessages
    ] 
}); 
const { token } = require('../src/config.json');

client.commands = new Collection();

const functions = fs.readdirSync("./src/Handler").filter(file => file.endsWith(".js"));
const eventFiles = fs.readdirSync("./src/Events").filter(file => file.endsWith(".js"));
const commandFolders = fs.readdirSync("./src/Commands"); 


(async () => {
    for (file of functions) {
        require(`./Handler/${file}`)(client);
    }
    client.handleEvents(eventFiles, './src/Events');
    client.handleCommands(commandFolders, "./src/Commands");
    
    client.login(token)
})();

