const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const { WebhookClient } = require('discord.js');
const webhooks = require('../../data/Webhooks');

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember, client) {
        try {
            // Check for role changes
            const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
            const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
            
            if (addedRoles.size === 0 && removedRoles.size === 0) return;

            const webhookUrl = webhooks.roles;
            if (!webhookUrl) return;

            // Default values
            let responsible = "System" // Use bot mention as default
            let reason = 'Automated action';
            const isAddition = addedRoles.size > 0;

            try {
                // Add small delay for audit logs to populate
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const auditLogs = await newMember.guild.fetchAuditLogs({
                    type: isAddition ? AuditLogEvent.MemberRoleUpdate : AuditLogEvent.MemberRoleRemove,
                    limit: 5
                });

                // Safely find and process audit log entry
                const entry = auditLogs.entries.find(e => {
                    if (!e || Date.now() - e.createdTimestamp > 20000) return false;
                    if (!e.target || e.target.id !== newMember.id) return false;
                    
                    const roleChange = e.changes?.find(change => 
                        (isAddition ? change.key === '$add' : change.key === '$remove') &&
                        (change.new || change.old)?.some(r => 
                            (isAddition ? addedRoles : removedRoles).has(r.id)
                        )
                    );
                    return !!roleChange;
                });

                if (entry?.executor) { // Added null check with optional chaining
                    responsible = entry.executor.toString();
                    reason = entry.reason || (entry.executor.bot ? 'Bot action' : 'Manual action');
                } else {

                }
            } catch (error) {
                console.error('Audit log error:', error);
                // Fall through with default values
            }

            const epochTime = Math.floor(Date.now() / 1000);
            const embed = new EmbedBuilder()
                .setColor(0xCC5711)
                .setTitle('Member Role Update')
                .setDescription(
                    `**Responsible:** ${responsible}\n` +
                    `**Target:** ${newMember}\n` +
                    `<t:${epochTime}:F>\n` +
                    `**Reason:** ${reason}`
                );

            if (addedRoles.size > 0) {
                embed.addFields({
                    name: 'Changes',
                    value: `<:Green_Tick:829330079431262259> **Additions:**\n⠀⠀<:ArrowPurple:1036964462239957074>${addedRoles.map(r => r.toString()).join('\n⠀⠀<:ArrowPurple:1036964462239957074>')}`,
                    inline: false
                });
            }

            if (removedRoles.size > 0) {
                embed.addFields({
                    name: 'Changes',
                    value: `<:Red_Tick:829330078172971009> **Removals:**\n⠀⠀<:ArrowPurple:1036964462239957074>${removedRoles.map(r => r.toString()).join('\n⠀⠀<:ArrowPurple:1036964462239957074>')}`,
                    inline: false
                });
            }

            await new WebhookClient({ url: webhookUrl }).send({
                embeds: [embed],
                username: 'PixelBound\'s Utilities',
                avatarURL: client.user.displayAvatarURL()
            });

        } catch (error) {
            console.error('Role update error:', error);
        }
    }
};