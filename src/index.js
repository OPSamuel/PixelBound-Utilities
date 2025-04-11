const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const express = require('express');
const path = require('path');
const statusHandler = require('./Api/status');
const { table } = require('table');
const chalk = require('chalk');
const NuclearErrorHandler = require('./Utils/errorHandler'); // Add error handler

// Load configuration
const config = require('./config.json');

// Status tracking object
const status = {
    events: {},
    commands: {},
    systems: {
        discord: '❌',
        express: '❌',
        commands: '❌'
    }
};

// Initialize Discord Client
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.DirectMessages
    ]
});

// Initialize error handler
const errorHandler = new NuclearErrorHandler(client);
errorHandler.enableDoomsdayProtocols();

client.commands = new Collection();

// Set up Express server for status updates
const app = express();
app.use(express.json());
const STATUS_PORT = 20051;

// Use the status handler router
app.use('/', statusHandler(client, config)); 

// Function to display status table
function displayStatusTable() {
    const data = [
        [chalk.bold.blue('SYSTEM'), chalk.bold.blue('STATUS')],
        ['Discord Connection', status.systems.discord],
        ['Express Server', status.systems.express],
        ['Commands System', status.systems.commands],
        ['', ''],
        [chalk.bold.blue('EVENTS'), chalk.bold.blue('STATUS')],
        ...Object.entries(status.events).map(([name, stat]) => [
            name, 
            stat === '✅' ? chalk.green(stat) : chalk.red(stat)
        ]),
        ['', ''],
        [chalk.bold.blue('COMMANDS'), chalk.bold.blue('STATUS')],
        ...Object.entries(status.commands).map(([name, stat]) => [
            name, 
            stat === '✅ ' ? chalk.green(stat) : chalk.red(stat)
        ])
    ];

    const tableConfig = {
        border: {
            topBody: `─`,
            topJoin: `┬`,
            topLeft: `┌`,
            topRight: `┐`,
            bottomBody: `─`,
            bottomJoin: `┴`,
            bottomLeft: `└`,
            bottomRight: `┘`,
            bodyLeft: `│`,
            bodyRight: `│`,
            bodyJoin: `│`,
            joinBody: `─`,
            joinLeft: `├`,
            joinRight: `┤`,
            joinJoin: `┼`
        },
        columns: [
            { alignment: 'left', width: 25 },
            { alignment: 'center', width: 10 }
        ]
    };

    console.log(chalk.bold.yellow('\n🚀 Startup Status Report'));
    console.log(table(data, tableConfig));
}

// Function to deploy commands
const deployCommands = errorHandler.wrap(async () => {
    try {
        const commands = [];
        const commandsPath = path.join(__dirname, 'Commands');
        const commandFolders = fs.readdirSync(commandsPath);

        for (const folder of commandFolders) {
            const folderPath = path.join(commandsPath, folder);
            const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
            
            for (const file of commandFiles) {
                const commandName = file.split('.')[0];
                try {
                    const filePath = path.join(folderPath, file);
                    const command = require(filePath);
                    
                    if ('data' in command && 'execute' in command) {
                        client.commands.set(command.data.name, {
                            ...command,
                            execute: errorHandler.wrap(command.execute) // Wrap command execution
                        });
                        commands.push(command.data.toJSON());
                        status.commands[commandName] = '✅';
                    } else {
                        console.log(chalk.yellow(`[WARNING] The command at ${filePath} is missing required properties.`));
                        status.commands[commandName] = '❌';
                    }
                } catch (error) {
                    status.commands[commandName] = '❌';
                    console.error(chalk.red(`❌ Failed to load command ${file}:`), error);
                }
            }
        }

        const rest = new REST({ version: '10' }).setToken(config.token);
        console.log(chalk.blue(`⌛ Refreshing ${commands.length} application commands...`));
        
        const data = await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commands },
        );
        
        status.systems.commands = '✅';
        console.log(chalk.green(`✅ Successfully reloaded ${data.length} application commands.`));
    } catch (error) {
        status.systems.commands = '❌';
        console.error(chalk.red('❌ Error deploying commands:'), error);
        throw error;
    }
});

// Ready event
client.once('ready', errorHandler.wrap(async () => {
    status.systems.discord = '✅';
    console.log(chalk.green(`\n🤖 Logged in as ${client.user.tag}`));
    
    await deployCommands();

    // Validate the status channel exists
    if (config.statusChannelId) {
        const channel = client.channels.cache.get(config.statusChannelId);
        if (!channel) {
            console.warn(chalk.yellow(`⚠️ Configured status channel ${config.statusChannelId} not found!`));
        }
    }

    app.listen(STATUS_PORT, () => {
        status.systems.express = '✅';
        displayStatusTable();
        console.log(chalk.blue(`🌐 Status API listening on port ${STATUS_PORT}`));
    });
}));

// Load event handlers
const loadHandlers = errorHandler.wrap(async () => {
    try {
        const eventsPath = path.join(__dirname, 'Events');
        if (fs.existsSync(eventsPath)) {
            // Recursively scan all directories
            const scanDirectory = (dir, category = '') => {
                const items = fs.readdirSync(dir, { withFileTypes: true });
                
                for (const item of items) {
                    const fullPath = path.join(dir, item.name);
                    const eventCategory = category ? `${category}/${item.name}` : item.name;

                    if (item.isDirectory()) {
                        scanDirectory(fullPath, eventCategory); // Recurse into subdirectories
                    } else if (item.isFile() && item.name.endsWith('.js')) {
                        const eventName = category 
                            ? `${category}/${item.name.split('.')[0]}`
                            : item.name.split('.')[0];
                        
                        try {
                            const event = require(fullPath);
                            const wrappedExecute = errorHandler.wrap((...args) => event.execute(...args, client));
                            
                            if (event.once) {
                                client.once(event.name, wrappedExecute);
                            } else {
                                client.on(event.name, wrappedExecute);
                            }
                            
                            status.events[eventName] = '✅';
                        } catch (error) {
                            status.events[eventName] = '❌';
                            console.error(chalk.red(`❌ Failed to load event ${eventName}:`), error);
                        }
                    }
                }
            };

            scanDirectory(eventsPath);
        }

        await client.login(config.token);
    } catch (error) {
        displayStatusTable();
        console.error(chalk.red('\n💥 FATAL: Failed to initialize bot:'), error);
        process.exit(1);
    }
});

// Start the bot
loadHandlers().catch(error => {
    displayStatusTable();
    console.error(chalk.red('\n💥 Bot failed to start:'), error);
    process.exit(1);
});