const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getProgress, deleteProgress, saveProgress } = require('../../Events/Tickets/followUpStorage');
const { applicationTypes } = require('../../Events/Tickets/ticket-menu');
const { askNextQuestion } = require('../../Events/Tickets/handleFollowUpQuestions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset-followup')
        .setDescription('Reset follow-up questions for a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to reset')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('user');
        const adminUser = interaction.user;
        const progress = getProgress(targetUser.id);

        if (!progress) {
            return interaction.followUp({
                content: `❌ No active follow-up found for ${targetUser.tag}`,
                ephemeral: true
            });
        }

        try {
            // 1. Delete existing progress
            deleteProgress(targetUser.id);

            // 2. Restart the process with original answers
            const newProgress = {
                role: progress.role,
                step: 0,
                answers: {},
                originalAnswers: progress.originalAnswers,
                channelId: interaction.channel.id
            };

            saveProgress(targetUser.id, newProgress);

            // 3. Get the current channel
            const channel = interaction.channel;
            const followUpQuestions = applicationTypes[progress.role].followUpQuestions;
            const firstQuestion = followUpQuestions[0];

            // Create embed for channel message
            const channelEmbed = new EmbedBuilder()
                .setColor('#FFA500') // Orange color for notices
                .setTitle(`Followup Question (1/${followUpQuestions.length})`)
                .setDescription(firstQuestion.label)
                .setFooter({
                    text: 'PixelBound Entertainment - Application System',
                    iconURL: 'https://cdn.discordapp.com/attachments/1188570570288275600/1353296064928813127/cb3ba39c559e8033534fddcc375a658b.png'
                })
                .setTimestamp();

            // Send to channel
            await channel.send({
                content: `${targetUser}, your follow-up questions have been reset. Please answer again:`,
                embeds: [channelEmbed]
            });

            // Send DM to user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#FFA500') // Orange color for notice
                    .setTitle('⚠️ Your Application Questions Were Reset')
                    .setDescription(`Your follow-up questions for the **${applicationTypes[progress.role].role}** application have been reset.`)
                    .addFields(
                        { name: 'Reset By', value: `${adminUser.tag} (${adminUser.id})` },
                        { name: 'Reason', value: 'Administrative action' }
                    )
                    .setFooter({ 
                        text: 'Please check your application channel for new questions',
                        iconURL: 'https://cdn.discordapp.com/attachments/1188570570288275600/1353296064928813127/cb3ba39c559e8033534fddcc375a658b.png'
                    })
                    .setTimestamp();

                await targetUser.send({
                    content: `Your application questions have been reset by a staff member.`,
                    embeds: [dmEmbed]
                });
            } catch (dmError) {
                console.log(`Could not DM ${targetUser.tag}:`, dmError);
                await interaction.followUp({
                    content: `⚠️ Could not send DM to ${targetUser.tag} about the reset`,
                    ephemeral: true
                });
            }

            await interaction.followUp({
                content: `✅ Successfully reset follow-ups for ${targetUser.tag}`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Reset follow-up error:', error);
            await interaction.followUp({
                content: `❌ Failed to reset follow-ups: ${error.message}`,
                ephemeral: true
            });
        }
    }
};