const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserCount = require("../../Schemas/UserCount");
const Counting = require("../../Schemas/Counting");
const { countAllUserMessages } = require("../../Utils/countingUtils");

// Cooldown tracking
const cooldowns = new Set();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recheck')
        .setDescription('Rescan your personal counting history'),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        // Cooldown check
        if (cooldowns.has(userId)) {
            return interaction.editReply({
                content: '⏳ Please wait 5 minutes between rescans',
                ephemeral: true
            });
        }

        try {
            // Get counting channel
            const countingData = await Counting.findOne({ Guild_ID: guildId });
            if (!countingData) {
                return interaction.editReply({
                    content: '❌ Counting channel not set up in this server',
                    ephemeral: true
                });
            }

            const channel = await interaction.guild.channels.fetch(countingData.Channel_ID);
            if (!channel) {
                return interaction.editReply({
                    content: '❌ Counting channel not found',
                    ephemeral: true
                });
            }

            // Apply cooldown
            cooldowns.add(userId);
            setTimeout(() => cooldowns.delete(userId), 300000); // 5 minutes

            await interaction.editReply({
                content: '⏳ Starting your count rescan...',
                ephemeral: true
            });

            // Use 'recheck' context
            const newCount = await countAllUserMessages(channel, userId, 'recheck');

            await UserCount.findOneAndUpdate(
                { g: guildId, u: userId },
                { 
                    c: newCount,
                    updatedAt: new Date()
                },
                { upsert: true }
            );

            await interaction.followUp({
                content: '✅ Your counts have been updated!',
                embeds: [
                    new EmbedBuilder()
                        .setColor('#00FF00')
                        .setDescription(`**New total counts:** ${newCount}`)
                ],
                ephemeral: true
            });

        } catch (error) {
            await interaction.editReply({
                content: `❌ ${error.message}`,
                ephemeral: true
            });
            cooldowns.delete(userId); // Remove cooldown on failure
        }
    }
};