const { Events, EmbedBuilder } = require('discord.js');
const webhooks = require('../../data/Webhooks');

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member) {
        try {
            // Configuration
            const config = {
                memberRoleId: '1203065702345478204',
                applicationsChannel: '1209561813788659762'
            };

            // Track success states
            let roleAssigned = false;
            let dmSent = false;

            // 1. Add Member Role
            try {
                const memberRole = member.guild.roles.cache.get(config.memberRoleId);
                if (memberRole) {
                    await member.roles.add(memberRole, "Member role added on join");
                    roleAssigned = true;
                } else {
                    console.error(`❌ Member role not found (ID: ${config.memberRoleId})`);
                }
            } catch (roleError) {
                console.error(`❌ Failed to add member role to ${member.user.tag}:`, roleError);
            }

            // 2. Send Welcome DM
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#fc7a23')
                .setTitle(`🎉 Welcome to ${member.guild.name}, ${member.user.username}! 🎉`)
                .setDescription(
                    `Hello and welcome to our community! We're thrilled to have you here.\n\n` +
                    `📜 **Applications**: Check <#${config.applicationsChannel}> to apply for roles\n` +
                    `✨ **Reaction Roles**: Customize your experience with roles\n` +
                    `🔥 **Supporter Role**: Visit Supporter Proof channel if you're a supporter\n` +
                    `❓ **Need Help?**: Check the Information channel or create a ticket\n` +
                    `💬 **Get Involved**: Introduce yourself and participate!\n\n` +
                    `We're excited to see you around! 🚀`
                )
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Welcome to the community!', iconURL: member.guild.iconURL() });

            try {
                await member.send({ embeds: [welcomeEmbed] });
                dmSent = true;
            } catch (dmError) {

            }

            // 3. Log via Webhook
            if (webhooks.NewGuildMember) {
                try {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('New Member Joined')
                        .setDescription(`**${member.user.tag}** (${member.user.id})`)
                        .addFields(
                            { name: 'Account Age', value: `<t:${Math.floor(member.user.createdTimestamp/1000)}:R>`, inline: true },
                            { name: 'Server Members', value: `${member.guild.memberCount}`, inline: true },
                            { 
                                name: 'Actions', 
                                value: `• Role: ${roleAssigned ? '✅ Assigned' : '❌ Failed'}\n` +
                                       `• Welcome DM: ${dmSent ? '✅ Sent' : '❌ Failed'}`,
                                inline: false
                            }
                        )
                        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
                        .setTimestamp();

                    await fetch(webhooks.NewGuildMember, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            embeds: [logEmbed.toJSON()],
                            username: 'PixelBound\'s Utilities',
                            avatar_url: member.client.user.displayAvatarURL()
                        })
                    });
                } catch (webhookError) {
                    console.error('❌ Failed to send webhook:', webhookError);
                }
            }
        } catch (mainError) {
            console.error('❌ Error in guildMemberAdd event:', mainError);
        }
    },
};