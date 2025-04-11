const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-permissions')
        .setDescription('Modify permissions for a role across all channels')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The role to modify permissions for')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('allow')
                .setDescription('Comma-separated permissions to allow (e.g. ViewChannel,SendMessages)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('deny')
                .setDescription('Comma-separated permissions to deny (e.g. ManageMessages,CreatePublicThreads)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const role = interaction.options.getRole('role');
        const allowInput = interaction.options.getString('allow') || '';
        const denyInput = interaction.options.getString('deny') || '';

        // Create permission overwrite object
        const overwrites = {};

        // Process allow permissions
        if (allowInput) {
            for (const perm of allowInput.split(',').map(p => p.trim())) {
                if (PermissionFlagsBits[perm]) {
                    overwrites[perm] = true;
                } else {
                    return interaction.followUp({ 
                        content: `Invalid permission: ${perm}`,
                        ephemeral: true 
                    });
                }
            }
        }

        // Process deny permissions
        if (denyInput) {
            for (const perm of denyInput.split(',').map(p => p.trim())) {
                if (PermissionFlagsBits[perm]) {
                    overwrites[perm] = false;
                } else {
                    return interaction.followUp({ 
                        content: `Invalid permission: ${perm}`,
                        ephemeral: true 
                    });
                }
            }
        }

        // Get all channels
        const channels = interaction.guild.channels.cache.filter(ch => 
            ch.type === ChannelType.GuildText || 
            ch.type === ChannelType.GuildVoice || 
            ch.type === ChannelType.GuildCategory
        );

        let successCount = 0;
        let failCount = 0;

        // Process each channel
        for (const [_, channel] of channels) {
            try {
                // Single permission update operation
                await channel.permissionOverwrites.edit(role, overwrites, {
                    reason: `Bulk permission update by ${interaction.user.tag}`
                });
                successCount++;
            } catch (error) {
                console.error(`Failed to update permissions for ${channel.name}:`, error);
                failCount++;
            }
        }

        await interaction.followUp({
            content: `Updated permissions for ${role.name} in ${successCount} channels (${failCount} failed)\n` +
                     `Allowed: ${allowInput || 'None'}\n` +
                     `Denied: ${denyInput || 'None'}`,
            ephemeral: true
        });
    }
};