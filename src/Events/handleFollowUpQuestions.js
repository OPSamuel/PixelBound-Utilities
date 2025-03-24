const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { applicationTypes, followUpProgress } = require('./ticket-menu');

// Helper function to truncate text
function truncateText(text, maxLength = 999) {
    return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignore messages from bots
        if (message.author.bot) return;

        // Check if this is a ticket channel by looking for user ID in topic
        if (!message.channel.topic || !message.channel.topic.includes('Ticket created by ')) {
            return; // Not a ticket channel, ignore
        }

        // Extract user ID from channel topic
        const ticketUserId = message.channel.topic.replace('Ticket created by ', '');
        if (message.author.id !== ticketUserId) {
            return; // Message not from ticket creator, ignore
        }

        // Check if the user is currently answering follow-up questions
        const progress = followUpProgress.get(message.author.id);
        if (!progress) {
            return; // User not in follow-up process
        }

        const { role, step, answers, originalAnswers } = progress;
        const followUpQuestions = applicationTypes[role].followUpQuestions;

        // Store the user's response
        const currentQuestion = followUpQuestions[step];
        answers[currentQuestion.id] = message.content;

        // Check if there are more follow-up questions
        if (step + 1 < followUpQuestions.length) {
            // Ask the next question
            const nextQuestion = followUpQuestions[step + 1];

            const embed = new EmbedBuilder()
                .setColor('#fc7a23')
                .setTitle(`Followup Question (${step + 2}/${followUpQuestions.length})`)
                .setDescription(nextQuestion.label)
                .setFooter({
                    text: 'PixelBound Entertainment - Ticket System',
                    iconURL: 'https://cdn.discordapp.com/attachments/1188570570288275600/1353296064928813127/cb3ba39c559e8033534fddcc375a658b.png',
                })
                .setTimestamp();

            await message.channel.send({ 
                embeds: [embed] 
            });

            // Update progress
            followUpProgress.set(message.author.id, {
                role,
                step: step + 1,
                answers,
                originalAnswers,
            });
        } else {
            // All questions answered - compile final application
            const combinedEmbed = new EmbedBuilder()
                .setColor('#fc7a23')
                .setTitle(`📄 ${applicationTypes[role].role} Application`)
                .setDescription(`From ${message.author.tag} (ID: ${message.author.id})`)
                .addFields(
                    ...applicationTypes[role].questions.map(q => ({
                        name: q.label,
                        value: truncateText(originalAnswers[q.id] || 'Not provided'),
                        inline: false
                    })),
                    ...followUpQuestions.map(q => ({
                        name: q.label,
                        value: truncateText(answers[q.id] || 'Not provided'),
                        inline: false
                    }))
                )
                .setFooter({
                    text: 'Application completed - Awaiting review',
                    iconURL: 'https://cdn.discordapp.com/attachments/1188570570288275600/1353296064928813127/cb3ba39c559e8033534fddcc375a658b.png'
                })
                .setTimestamp();

            // Create Accept/Deny buttons
            const decisionButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`accept_${message.author.id}_${role}`)
                    .setLabel('Accept')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`deny_${message.author.id}_${role}`)
                    .setLabel('Deny')
                    .setStyle(ButtonStyle.Danger)
            );

            // Send to ticket channel
            await message.channel.send({
                embeds: [combinedEmbed]
            });

            // Send to logs channel with decision buttons
            const logsChannel = message.guild.channels.cache.get('1353384761980358817');
            if (logsChannel) {
                await logsChannel.send({ 
                    //content: `New application from ${message.author.tag} (ID: ${message.author.id})`,
                    embeds: [combinedEmbed],
                    components: [decisionButtons]
                });
            }

            // Clear progress
            followUpProgress.delete(message.author.id);
        }
    },
};