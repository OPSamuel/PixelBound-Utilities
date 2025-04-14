const { Events, EmbedBuilder } = require('discord.js');
const { WebhookClient } = require('discord.js');
const webhooks = require('../../data/Webhooks');

module.exports = {
    name: Events.MessageBulkDelete,
    async execute(messages, channel, client) {
        try {
            const webhookUrl = webhooks.messages;
            if (!webhookUrl) {
                console.log('No webhook URL configured for message logs');
                return;
            }

            const webhookClient = new WebhookClient({ url: webhookUrl });

            // Get the executor (user who deleted the messages)
            const auditLogs = await channel.guild.fetchAuditLogs({
                type: 73,
                limit: 1
            });
            const executor = auditLogs.entries.first()?.executor || 'Unknown';

            const embed = new EmbedBuilder()
                .setColor(0xCC5711) // Same orange color scheme
                .setAuthor({
                    name: 'PixelBound Entertainment™',
                    iconURL: client.user.displayAvatarURL()
                })
                .setDescription(`**Bulk Delete in ${channel}, ${messages.size} messages deleted**\n\n**Deleted by** ${executor}`)
                .setTimestamp()

            await webhookClient.send({
                embeds: [embed],
                username: 'PixelBound\'s Utilities',
                avatarURL: client.user.displayAvatarURL()
            });

            webhookClient.destroy();
        } catch (error) {
            console.error('Error handling bulk delete:', error);
        }
    }
};