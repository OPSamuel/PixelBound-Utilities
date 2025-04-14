const { EmbedBuilder } = require('discord.js');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

module.exports = async (client, config, status) => {
    try {
        // Check if owner ID is configured
        if (!config.ownerId) {
            console.warn(chalk.yellow('⚠️ Owner ID not configured - skipping startup report'));
            return;
        }

        // Fetch the owner user
        const owner = await client.users.fetch(config.ownerId).catch(() => null);
        if (!owner) {
            console.warn(chalk.yellow(`⚠️ Could not fetch owner user (ID: ${config.ownerId})`));
            return;
        }
        // Count command categories from folder structure
        const commandsPath = path.join(__dirname, '../Commands'); // Adjust path as needed
        let commandCategories = 0;
        if (fs.existsSync(commandsPath)) {
            commandCategories = fs.readdirSync(commandsPath)
                .filter(file => fs.statSync(path.join(commandsPath, file)).isDirectory())
                .length;
        }

        // Prepare command statistics
        const loadedCommands = Object.values(status.commands).filter(s => s === '✅').length;
        const failedCommands = Object.values(status.commands).filter(s => s === '❌').length;
        const totalCommands = loadedCommands + failedCommands;

        // Prepare event statistics (still using name splitting)
        const eventEntries = Object.entries(status.events);
        const loadedEvents = eventEntries.filter(([_, stat]) => stat === '✅').length;
        const failedEvents = eventEntries.filter(([_, stat]) => stat === '❌').length;
        const totalEvents = loadedEvents + failedEvents;
        const eventCategories = new Set(eventEntries.map(([name]) => name.split('/')[0])).size;

        // Create the embed
        const embed = new EmbedBuilder()
            .setColor(failedCommands + failedEvents > 0 ? 0xFF0000 : 0x00FF00)
            .setTitle('🚀 Bot Startup Report')
            .setDescription(`**${client.user.tag}** is now online!`)
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                {
                    name: '📊 System Status',
                    value: [
                        `🤖 **Discord**: ${status.systems.discord}`,
                        `🌐 **Express**: ${status.systems.express}`,
                        `🛠️ **Commands**: ${status.systems.commands}`,
                        `⏱️ **Uptime**: <t:${Math.floor(Date.now() / 1000)}:R>`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '📝 Commands',
                    value: [
                        `✅ Loaded: ${loadedCommands}/${totalCommands}`,
                        `❌ Failed: ${failedCommands}`,
                        `📂 Categories: ${commandCategories}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🔔 Events',
                    value: [
                        `✅ Loaded: ${loadedEvents}/${totalEvents}`,
                        `❌ Failed: ${failedEvents}`,
                        `📂 Categories: ${eventCategories}`
                    ].join('\n'),
                    inline: true
                }
            )
            .setFooter({ text: `Bot ID: ${client.user.id}` })
            .setTimestamp();

        // Add detailed command list if there are failures
        if (failedCommands > 0) {
            const failedList = commandEntries
                .filter(([_, stat]) => stat === '❌')
                .map(([name]) => `• ${name}`)
                .join('\n');

            embed.addFields({
                name: `❌ Failed Commands (${failedCommands})`,
                value: failedList || 'None',
                inline: false
            });
        }

        // Add detailed event list if there are failures
        if (failedEvents > 0) {
            const failedList = eventEntries
                .filter(([_, stat]) => stat === '❌')
                .map(([name]) => `• ${name}`)
                .join('\n');

            embed.addFields({
                name: `❌ Failed Events (${failedEvents})`,
                value: failedList || 'None',
                inline: false
            });
        }

        // Send the DM
        await owner.send({ embeds: [embed] });
    } catch (error) {
        console.error(chalk.red('❌ Failed to send startup report:'), error);
    }
};