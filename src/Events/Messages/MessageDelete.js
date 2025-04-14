const { Events, EmbedBuilder } = require('discord.js');
const { WebhookClient } = require('discord.js');
const webhooks = require('../../data/Webhooks');

module.exports = {
    name: Events.MessageDelete,
    async execute(deletedMessage, client) {
        if (deletedMessage.author?.bot) return;

        try {
            const webhookUrl = webhooks.messages;
            if (!webhookUrl) {
                return;
            }

            const webhookClient = new WebhookClient({ url: webhookUrl });

            // Check for image attachments
            const imageAttachments = Array.from(deletedMessage.attachments.values())
                .filter(attach => attach.contentType?.startsWith('image/'));

            const embed = new EmbedBuilder()
                .setColor(0xCC5711)
                .setAuthor({
                    name: deletedMessage.author?.username || 'Deleted User',
                    iconURL: deletedMessage.author?.displayAvatarURL({ dynamic: true }) || client.user.displayAvatarURL()
                })
                .setFooter({
                    text: `Author: ${deletedMessage.author?.id || 'Unknown'} | Message ID: ${deletedMessage.id}`
                })
                .setTimestamp();

            // Set the description based on content type
            if (imageAttachments.length > 0) {
                // For image messages
                embed.setDescription(`**Image sent by ${deletedMessage.author || 'Deleted User'} Deleted in ${deletedMessage.channel}**`);
                
                // Add the first image to the embed
                embed.setImage(imageAttachments[0].proxyURL);
                
                // Include text content if it exists
                if (deletedMessage.content) {
                    embed.addFields({
                        name: 'Message',
                        value: truncate(deletedMessage.content, 1024),
                        inline: false
                    });
                }
                
                // Add additional images as fields
                if (imageAttachments.length > 1) {
                    embed.addFields({
                        name: `Additional Images (${imageAttachments.length - 1})`,
                        value: imageAttachments.slice(1).map(a => `[${a.name}](${a.proxyURL})`).join('\n'),
                        inline: false
                    });
                }
            } else {
                // For text messages
                let description = `**Message sent by ${deletedMessage.author || 'Deleted User'} Deleted in ${deletedMessage.channel}**\n`;
                description += deletedMessage.content ? truncate(deletedMessage.content, 2000) : '*No text content*';

                // Handle non-image attachments
                if (deletedMessage.attachments.size > 0) {
                    description += '\n\n**Attachments:**';
                    deletedMessage.attachments.forEach(attachment => {
                        description += `\n[${attachment.name}](${attachment.proxyURL})`;
                    });
                }

                embed.setDescription(description);
            }

            await webhookClient.send({
                embeds: [embed],
                username: 'PixelBound\'s Utilities',
                avatarURL: client.user.displayAvatarURL()
            });

            webhookClient.destroy();
        } catch (error) {
            console.error('Error handling message delete:', error);
        }
    }
};

function truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max - 3) + '...' : str;
}