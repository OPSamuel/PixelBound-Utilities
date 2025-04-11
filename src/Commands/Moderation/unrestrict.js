const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require("../../config.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unrestrict')
        .setDescription('Removes restriction from a user and restores their previous roles')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to unrestrict')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for unrestriction')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const RESTRICTED_ROLE_ID = config.roles.restricted;
        const LOG_CHANNEL_ID = config.channels.modLogs;
        const ROLE_BACKUP_FILE = path.join(__dirname, '..', '..', 'data', 'Backups', 'role_backups.json');

        const { options, user: staffMember, guild } = interaction;
        const targetUser = options.getUser('user');
        const reason = options.getString('reason');
        const member = await guild.members.fetch(targetUser.id).catch(() => null);

        // Validation checks
        if (!member) {
            return interaction.followUp({
                content: "❌ Target user not found in this server.",
                ephemeral: true
            });
        }

        const restrictedRole = guild.roles.cache.get(RESTRICTED_ROLE_ID);
        if (!restrictedRole) {
            return interaction.followUp({
                content: "❌ Restricted role not configured properly.",
                ephemeral: true
            });
        }

        if (!member.roles.cache.has(restrictedRole.id)) {
            return interaction.followUp({
                content: `ℹ️ ${targetUser.username} is not currently restricted.`,
                ephemeral: true
            });
        }

        try {
            // Load role backups
            if (!fs.existsSync(ROLE_BACKUP_FILE)) {
                return interaction.followUp({
                    content: "❌ No role backups found. Cannot restore roles.",
                    ephemeral: true
                });
            }

            const backups = JSON.parse(fs.readFileSync(ROLE_BACKUP_FILE, 'utf8'));
            const userBackup = backups[targetUser.id];

            if (!userBackup) {
                return interaction.followUp({
                    content: "❌ No role backup found for this user.",
                    ephemeral: true
                });
            }

            // Get role names for logging
            const getRoleNames = (roleIds) => {
                return roleIds.map(id => {
                    const role = guild.roles.cache.get(id);
                    return role ? role.name : `[Deleted Role: ${id}]`;
                }).join(', ') || 'None';
            };

            // Restore previous roles
            const rolesToAdd = userBackup.roles.filter(roleId => 
                guild.roles.cache.has(roleId) && 
                guild.roles.cache.get(roleId).position < guild.members.me.roles.highest.position
            );

            let addedRolesNames = 'None';
            if (rolesToAdd.length > 0) {
                await member.roles.add(rolesToAdd);
                addedRolesNames = getRoleNames(rolesToAdd);
            }

             // Remove restricted role first
             await member.roles.remove(restrictedRole);
             const removedRestrictedRole = restrictedRole.name;

            // Remove from backup file
            delete backups[targetUser.id];
            fs.writeFileSync(ROLE_BACKUP_FILE, JSON.stringify(backups, null, 2));

            // Send DM to user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('✅ Restriction Lifted')
                    .setColor(0x00FF00)
                    .setDescription(`Your account in **${guild.name}** has been unrestricted.`)
                    .addFields(
                        { name: '🔹 Reason', value: reason },
                        { name: '🔄 Roles Restored', value: rolesToAdd.length > 0 ? 
                            addedRolesNames : 'No roles to restore' },
                        { name: '📌 Note', value: 'Your previous roles have been restored where possible.' }
                    )
                    .setFooter({ text: `${guild.name} Security System` })
                    .setTimestamp();

                await targetUser.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                console.log(`Couldn't DM ${targetUser.tag}`);
            }

            // Log to moderation channel
            const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) {
                const originalRoles = getRoleNames(userBackup.roles);
                
                const logEmbed = new EmbedBuilder()
                    .setTitle('🔄 Account Unrestricted')
                    .setColor(0x00FF00)
                    .setThumbnail(targetUser.displayAvatarURL())
                    .addFields(
                        { name: '👤 User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                        { name: '🛠️ Unrestricted By', value: `${staffMember.tag} (${staffMember.id})`, inline: true },
                        { name: '📅 Date', value: new Date().toLocaleString(), inline: true },
                        { name: '📌 Reason', value: reason },
                        { name: '➖ Role Removed', value: removedRestrictedRole, inline: true },
                        { name: '➕ Roles Added', value: addedRolesNames, inline: true },
                        { name: '📝 Original Roles', value: originalRoles || 'None' },
                        { name: '🔢 Stats', value: `• ${rolesToAdd.length} of ${userBackup.roles.length} roles restored`, inline: true },
                        { name: '📝 Original Restriction', value: `By: <@${userBackup.restrictedBy}>\nReason: ${userBackup.reason || 'Not specified'}` }
                    )
                    .setFooter({ text: 'Account Unrestriction Log' })
                    .setTimestamp();

                await logChannel.send({ 
                    content: `🔄 Restriction lifted from ${targetUser}`,
                    embeds: [logEmbed] 
                });
            }

            await interaction.followUp({
                content: `✅ Successfully unrestricted ${targetUser.tag}\n` +
                         `• Removed role: ${removedRestrictedRole}\n` +
                         `• Restored roles: ${addedRolesNames}\n` +
                         `**Reason:** ${reason}`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Unrestriction Error:', error);
            await interaction.followUp({
                content: "❌ Failed to unrestrict user. Check console for details.",
                ephemeral: true
            });
        }
    }
};