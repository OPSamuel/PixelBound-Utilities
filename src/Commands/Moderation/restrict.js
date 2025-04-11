const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('restrict')
        .setDescription('Restricts a user by applying the Alternate Account role and removing other privileges')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to restrict')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Detailed reason for restriction')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        // Configuration from config.json
        const RESTRICTED_ROLE_ID = config.roles.restricted;
        const LOG_CHANNEL_ID = config.channels.modLogs;
        const APPEALS_CHANNEL_ID = config.channels.appeals;
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

        if (restrictedRole.position >= guild.members.me.roles.highest.position) {
            return interaction.followUp({
                content: "❌ I can't manage this role due to hierarchy position.",
                ephemeral: true
            });
        }

        if (member.roles.cache.has(restrictedRole.id)) {
            return interaction.followUp({
                content: `ℹ️ ${targetUser.username} is already restricted.`,
                ephemeral: true
            });
        }

        try {
            // Ensure data directory exists
            if (!fs.existsSync(path.join(__dirname, '..', '..', 'data'))) {
                fs.mkdirSync(path.join(__dirname, '..', '..', 'data'));
            }

            // Load existing backups
            let backups = {};
            if (fs.existsSync(ROLE_BACKUP_FILE)) {
                backups = JSON.parse(fs.readFileSync(ROLE_BACKUP_FILE, 'utf8'));
            }

            // Get current roles (excluding @everyone and managed roles)
            const currentRoles = member.roles.cache
                .filter(role => !role.managed && role.id !== guild.id)
                .map(role => role.id);

            // Save to backup file
            backups[targetUser.id] = {
                roles: currentRoles,
                restrictedBy: staffMember.id,
                timestamp: new Date().toISOString(),
                reason: reason,
                guildId: guild.id
            };

            fs.writeFileSync(ROLE_BACKUP_FILE, JSON.stringify(backups, null, 2));

            // Remove existing roles (except @everyone)
            const rolesToRemove = member.roles.cache
                .filter(role => !role.managed && role.id !== guild.id)
                .map(role => role.id);

            if (rolesToRemove.length > 0) {
                await member.roles.remove(rolesToRemove);
            }

            // Apply restricted role
            await member.roles.add(restrictedRole);

            // Send detailed DM to user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('⚠️ Account Restriction Notice')
                    .setColor(0xFFA500)
                    .setDescription(`Your account in **${guild.name}** has been restricted.`)
                    .addFields(
                        { name: '🔹 Restriction Reason', value: reason },
                        { name: '📋 Restrictions Applied', 
                          value: '• Can only view specific channels\n• Cannot interact with most content\n• Limited server participation' },
                        { name: '📝 Appeal Process', 
                          value: `If you believe this was a mistake:\n1. Go to <#${APPEALS_CHANNEL_ID}>\n2. Provide evidence\n3. Wait for staff review` },
                        { name: '❗ Important', 
                          value: 'Attempting to bypass restrictions may result in a permanent ban.' }
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
                const logEmbed = new EmbedBuilder()
                    .setTitle('🚨 Account Restricted')
                    .setColor(0xFF0000)
                    .setThumbnail(targetUser.displayAvatarURL())
                    .addFields(
                        { name: '👤 User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                        { name: '🛠️ Restricted By', value: `${staffMember.tag} (${staffMember.id})`, inline: true },
                        { name: '📅 Date', value: new Date().toLocaleString(), inline: true },
                        { name: '📌 Reason', value: reason },
                        { name: '🔧 Roles Removed', value: rolesToRemove.length.toString(), inline: true },
                        { name: '➕ Role Added', value: `<@&${RESTRICTED_ROLE_ID}>`, inline: true }
                    )
                    .setFooter({ text: 'Account Restriction Log' })
                    .setTimestamp();

                await logChannel.send({ 
                    content: `📝 New restriction applied to ${targetUser}`,
                    embeds: [logEmbed] 
                });
            }

            await interaction.followUp({
                content: `✅ Successfully restricted ${targetUser.tag} and backed up their roles.\n**Reason:** ${reason}`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Restriction Error:', error);
            await interaction.followUp({
                content: "❌ Failed to restrict user. Check console for details.",
                ephemeral: true
            });
        }
    }
};