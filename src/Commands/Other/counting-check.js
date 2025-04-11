const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const UserCount = require('../../Schemas/UserCount');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('counting-check')
        .setDescription('Check your counting statistics')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Check another user\'s stats (optional)')
                .setRequired(false)),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        
        const userStats = await UserCount.findOne({
            g: interaction.guildId,
            u: targetUser.id
        });

        if (!userStats) {
            return interaction.reply({
                content: `${targetUser.username} hasn't counted yet!`,
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle(`${targetUser.username}'s Counting Stats`)
            .addFields(
                { name: 'Total Counts', value: `${userStats.c}`, inline: true },
                { name: 'Last Count', value: `${userStats.l || 'None'}`, inline: true },
            )
            .setThumbnail(targetUser.displayAvatarURL());

        await interaction.reply({ embeds: [embed] });
    }
};