const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { WebhookClient } = require('discord.js');
const webhooks = require('../../data/Webhooks');

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage, client) {
        // Skip if the message wasn't actually edited or is from a bot
        if (oldMessage.content === newMessage.content || newMessage.author.bot) return;

        try {
            // Get the webhook URL from Webhooks.js
            const webhookUrl = webhooks.messages;
            
            if (!webhookUrl) {
                return;
            }

            // Create webhook client
            const webhookClient = new WebhookClient({ url: webhookUrl });

            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setAuthor({
                    name: newMessage.author.username,
                    iconURL: newMessage.author.displayAvatarURL({ dynamic: true })
                })
                .setDescription(`**Message Edited in ${newMessage.channel}** [Jump to Message](${newMessage.url})`)
                .addFields(
                    { name: 'Before', value: truncate(oldMessage.content, 1024) || '*No content*' },
                    { name: 'After', value: truncate(newMessage.content, 1024) || '*No content*' }
                )
                .setFooter({
                    text: `User ID: ${newMessage.author.id}`
                })
                .setTimestamp();

            await webhookClient.send({
                embeds: [embed],
                username: 'PixelBound\'s Utilities',
                avatarURL: client.user.displayAvatarURL()
            });

            // Destroy the webhook client to clean up
            webhookClient.destroy();
        } catch (error) {
            console.error('Error handling message edit:', error);
        }
    }
};

function truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max - 3) + '...' : str;
}