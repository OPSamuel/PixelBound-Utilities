const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const Counting = require("../../Schemas/Counting");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('counting')
        .setDescription('Configure your server\'s counting game')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        // Create a beautiful embed
        const embed = new EmbedBuilder()
            .setTitle('🔢 Counting System Configuration')
            .setDescription('Customize your counting game with these options:')
            .setColor(0x5865F2) // Discord blurple
            .setFooter({ 
                text: `Requested by ${interaction.user.tag}`, 
                iconURL: interaction.user.displayAvatarURL() 
            });

        // Create the selection menu with better options
        const selectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('counting-options')
                    .setPlaceholder('Select an action...')
                    .addOptions([
                        {
                            label: '📌 Set Counting Channel',
                            description: 'Choose where counting happens',
                            value: 'set_channel',
                            emoji: '📌'
                        },
                        {
                            label: '🔢 Set Current Count',
                            description: 'Change the current number',
                            value: 'set_count',
                            emoji: '🔢'
                        },
                        {
                            label: '🔄 Reset Counting',
                            description: 'Start fresh with new settings',
                            value: 'reset',
                            emoji: '🔄'
                        },
                        {
                            label: 'ℹ️ Counting Info',
                            description: 'View current counting settings',
                            value: 'info',
                            emoji: 'ℹ️'
                        }
                    ])
            );

        await interaction.reply({
            embeds: [embed],
            components: [selectMenu],
            ephemeral: true
        });
    }
};