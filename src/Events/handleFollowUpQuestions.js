const { Events, EmbedBuilder } = require('discord.js');
const { applicationTypes, followUpProgress } = require('./ticket-menu'); // Adjust the path as needed

// Helper function to truncate text
function truncateText(text, maxLength = 999) {
    return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignore messages from bots
        if (message.author.bot) return;

        // Check if the user is currently answering follow-up questions
        const userId = message.author.id;
        const progress = followUpProgress.get(userId);

        if (!progress) {
            return; // The user is not answering follow-up questions
        }

        const { role, step, answers, originalAnswers } = progress;
        const followUpQuestions = applicationTypes[role].followUpQuestions;

        // Store the user's response
        const currentQuestion = followUpQuestions[step];
        answers[currentQuestion.id] = message.content; // Store the message content as the answer

        // Check if there are more follow-up questions
        if (step + 1 < followUpQuestions.length) {
            // Ask the next question
            const nextQuestion = followUpQuestions[step + 1];

            const embed = new EmbedBuilder()
            .setColor('#fc7a23')
            .setTitle(`Followup Questions`)
            .setDescription(`${nextQuestion.label}`)
            .setFooter({
                text: 'PixelBound Entertainment - Ticket System',
                iconURL: 'https://cdn.discordapp.com/attachments/1188570570288275600/1353296064928813127/cb3ba39c559e8033534fddcc375a658b.png',
            })
            .setTimestamp();

            await message.channel.send({
                embeds: [embed],
            });

            // Update the progress
            followUpProgress.set(userId, {
                role,
                step: step + 1,
                answers,
                originalAnswers, // Preserve the original answers
            });
        } else {
            // All follow-up questions have been answered
            await message.channel.send({
                content: `${message.author}, thank you for answering all the follow-up questions!`,
            });

            // Combine original answers and follow-up answers
            const combinedAnswers = {
                ...originalAnswers, // Original application answers
                ...answers, // Follow-up answers
            };

            // Create a single embed with all answers
            const combinedEmbed = new EmbedBuilder()
                .setColor('#fc7a23')
                .setTitle(`📄 Application from ${message.author.tag}`)
                .setDescription(`**Role Applied For:** ${applicationTypes[role].role}`)
                .addFields(
                    // Add original application questions
                    ...applicationTypes[role].questions.map((question) => ({
                        name: question.label,
                        value: truncateText(originalAnswers[question.id] || 'Not provided'), // Truncate if necessary
                        inline: false,
                    })),
                    // Add follow-up questions
                    ...followUpQuestions.map((question) => ({
                        name: question.label,
                        value: truncateText(answers[question.id] || 'Not provided'), // Truncate if necessary
                        inline: false,
                    })),
                )
                .setFooter({
                    text: 'PixelBound Entertainment - Staff Applications',
                    iconURL: 'https://cdn.discordapp.com/attachments/1188570570288275600/1353296064928813127/cb3ba39c559e8033534fddcc375a658b.png',
                })
                .setTimestamp();

            // Send the combined embed to the ticket channel
            await message.channel.send({
                embeds: [combinedEmbed],
            });

            // Send the combined embed to the logs channel
            const logsChannel = message.guild.channels.cache.get('1353384761980358817'); // Replace with your logs channel ID
            if (logsChannel) {
                await logsChannel.send({
                    embeds: [combinedEmbed],
                });
            } else {
                console.error('Logs channel not found!');
            }

            // Clear the user's progress
            followUpProgress.delete(userId);
        }
    },
};