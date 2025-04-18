const { Events, EmbedBuilder } = require('discord.js');
const { WebhookClient } = require('discord.js');
const webhooks = require('../../data/Webhooks');

module.exports = {
    name: Events.MessageDelete,
    async execute(deletedMessage, client) {
        if (deletedMessage.author?.bot) return;

        try {
            const webhookUrl = webhooks.messages;
            if (!webhookUrl) return;

            const webhookClient = new WebhookClient({ url: webhookUrl });
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

            if (imageAttachments.length > 0) {
                embed.setDescription(`**Image sent by ${deletedMessage.author || 'Deleted User'} Deleted in ${deletedMessage.channel}**`);
                embed.setImage(imageAttachments[0].proxyURL);
                
                if (deletedMessage.content) {
                    embed.addFields({
                        name: 'Message',
                        value: truncate(deletedMessage.content, 1024),
                        inline: false
                    });
                }
                
                // Fixed: Split long image lists into multiple fields
                if (imageAttachments.length > 1) {
                    const imageLinks = imageAttachments.slice(1).map(a => `[${a.name}](${a.proxyURL})`);
                    const chunkSize = 5; // Number of images per field
                    
                    for (let i = 0; i < imageLinks.length; i += chunkSize) {
                        const chunk = imageLinks.slice(i, i + chunkSize);
                        embed.addFields({
                            name: `Additional Images (${i+1}-${Math.min(i+chunkSize, imageLinks.length)})`,
                            value: chunk.join('\n'),
                            inline: false
                        });
                    }
                }
            } else {
                let description = `**Message sent by ${deletedMessage.author || 'Deleted User'} Deleted in ${deletedMessage.channel}**\n`;
                description += deletedMessage.content ? truncate(deletedMessage.content, 2000) : '*No text content*';

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