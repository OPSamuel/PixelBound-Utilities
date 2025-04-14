const { EmbedBuilder } = require('discord.js');
const chalk = require('chalk');

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

        // Prepare command statistics
        const loadedCommands = Object.values(status.commands).filter(s => s === '✅').length;
        const failedCommands = Object.values(status.commands).filter(s => s === '❌').length;
        const totalCommands = loadedCommands + failedCommands;

        // Prepare event statistics
        const loadedEvents = Object.values(status.events).filter(s => s === '✅').length;
        const failedEvents = Object.values(status.events).filter(s => s === '❌').length;
        const totalEvents = loadedEvents + failedEvents;

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
                        `📂 Categories: ${new Set(Object.keys(status.commands).map(c => c.split('/')[0])).size}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🔔 Events',
                    value: [
                        `✅ Loaded: ${loadedEvents}/${totalEvents}`,
                        `❌ Failed: ${failedEvents}`,
                        `📂 Categories: ${new Set(Object.keys(status.events).map(e => e.split('/')[0])).size}`
                    ].join('\n'),
                    inline: true
                }
            )
            .setFooter({ text: `Bot ID: ${client.user.id}` })
            .setTimestamp();

        // Add detailed command list if there are failures
        if (failedCommands > 0) {
            const failedList = Object.entries(status.commands)
                .filter(([_, status]) => status === '❌')
                .map(([name]) => `• ${name}`)
                .join('\n');

            embed.addFields({
                name: '❌ Failed Commands',
                value: failedList || 'None',
                inline: false
            });
        }

        // Add detailed event list if there are failures
        if (failedEvents > 0) {
            const failedList = Object.entries(status.events)
                .filter(([_, status]) => status === '❌')
                .map(([name]) => `• ${name}`)
                .join('\n');

            embed.addFields({
                name: '❌ Failed Events',
                value: failedList || 'None',
                inline: false
            });
        }

        // Send the DM
        await owner.send({ embeds: [embed] });
        console.log(chalk.green(`📨 Sent startup report to ${owner.tag}`));
    } catch (error) {
        console.error(chalk.red('❌ Failed to send startup report:'), error);
    }
};