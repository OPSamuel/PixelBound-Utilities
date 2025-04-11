const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, codeBlock } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('view-restriction')
        .setDescription('View a user\'s restriction details')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('user');
        const ROLE_BACKUP_FILE = path.join(__dirname, '..', '..', 'data', 'Backups', 'role_backups.json');

        try {
            // Verify file exists
            if (!fs.existsSync(ROLE_BACKUP_FILE)) {
                return interaction.followUp({
                    content: '❌ role_backups.json file not found',
                    ephemeral: true
                });
            }

            // Read and parse the file
            const backupData = JSON.parse(fs.readFileSync(ROLE_BACKUP_FILE, 'utf8'));
            const userRestriction = backupData[targetUser.id];

            if (!userRestriction) {
                return interaction.followUp({
                    content: `❌ No restriction data found for ${targetUser.tag} in role_backups.json`,
                    ephemeral: true
                });
            }

            // Format the roles list
            const rolesList = userRestriction.roles && userRestriction.roles.length > 0
                ? userRestriction.roles.map(roleId => `<@&${roleId}>`).join(', ')
                : 'No roles backed up';

            // Create detailed embed
            const embed = new EmbedBuilder()
                .setColor('#FFA500') // Orange for restriction notice
                .setTitle(`🔐 Restriction Backup: ${targetUser.tag}`)
                .setDescription(`User ID: ${targetUser.id}`)
                .addFields(
                    { name: 'Backed-up Roles', value: rolesList || 'None', inline: false },
                    { name: 'Restricted By', value: userRestriction.restrictedBy ? `<@${userRestriction.restrictedBy}>` : 'System', inline: true },
                    { name: 'Date Restricted', value: new Date(userRestriction.timestamp).toLocaleString(), inline: true },
                    { name: 'Reason', value: userRestriction.reason || 'Not specified', inline: false }
                )
                .setFooter({ text: `Data from role_backups.json ` })
                .setTimestamp();

            // Send response with both formatted and raw data
            await interaction.followUp({
                embeds: [embed],
                //content: `Raw backup data:\n${codeBlock('json', JSON.stringify(userRestriction, null, 2))}`,
                ephemeral: true
            });

        } catch (error) {
            console.error('View restriction error:', error);
            await interaction.followUp({
                content: `❌ Error reading role_backups.json: ${error.message}`,
                ephemeral: true
            });
        }
    }
};