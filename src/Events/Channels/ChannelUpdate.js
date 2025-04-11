const { Events, EmbedBuilder, AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const { WebhookClient } = require('discord.js');
const webhooks = require('../../data/Webhooks');

module.exports = {
    name: Events.ChannelUpdate,
    async execute(oldChannel, newChannel, client) {
        try {
            const webhookUrl = webhooks.channels;
            if (!webhookUrl || !oldChannel || !newChannel || !oldChannel.isTextBased() || !newChannel.isTextBased()) {
                return;
            }
            await logPermissionUpdates(oldChannel, newChannel, client, webhookUrl);
        } catch (error) {
            console.error('Channel update error:', error);
        }
    }
};

async function logPermissionUpdates(oldChannel, newChannel, client, webhookUrl) {
    const oldPerms = oldChannel.permissionOverwrites.cache;
    const newPerms = newChannel.permissionOverwrites.cache;
    
    const updatedPerms = [];
    
    // Only track updated permissions (not created/deleted)
    newPerms.forEach(newPerm => {
        const oldPerm = oldPerms.get(newPerm.id);
        if (oldPerm) {
            const allowedChanges = oldPerm.allow.bitfield ^ newPerm.allow.bitfield;
            const deniedChanges = oldPerm.deny.bitfield ^ newPerm.deny.bitfield;
            
            if (allowedChanges || deniedChanges) {
                updatedPerms.push({
                    perm: newPerm,
                    oldAllow: oldPerm.allow.bitfield,
                    oldDeny: oldPerm.deny.bitfield,
                    newAllow: newPerm.allow.bitfield,
                    newDeny: newPerm.deny.bitfield
                });
            }
        }
    });

    if (updatedPerms.length === 0) return;

    // Get responsible user from most recent audit log entry
    let responsible = 'System';
    try {
        const auditLogs = await newChannel.guild.fetchAuditLogs({
            type: AuditLogEvent.ChannelOverwriteUpdate,
            limit: 1
        });

        const entry = auditLogs.entries.first();
        if (entry && Date.now() - entry.createdTimestamp < 10000) { // 10 second window
            responsible = entry.executor?.toString() || 'System (Unknown User)';
        }
    } catch (error) {
        console.error('Audit log error:', error);
    }

    // Format permission updates
    const permissionFields = updatedPerms.map(update => {
        const target = update.perm.type === 1 ? 
            `<@${update.perm.id}>` : 
            `<@&${update.perm.id}>`;

        const changedPermissions = Object.keys(PermissionFlagsBits)
            .filter(perm => {
                const permBit = PermissionFlagsBits[perm];
                return (update.oldAllow & permBit) !== (update.newAllow & permBit) ||
                       (update.oldDeny & permBit) !== (update.newDeny & permBit);
            })
            .map(perm => {
                const permBit = PermissionFlagsBits[perm];
                const wasAllowed = (update.oldAllow & permBit) === permBit;
                const wasDenied = (update.oldDeny & permBit) === permBit;
                const nowAllowed = (update.newAllow & permBit) === permBit;
                const nowDenied = (update.newDeny & permBit) === permBit;
                
                if (nowAllowed && !wasAllowed) return `✅ ${perm}`;
                if (nowDenied && !wasDenied) return `❌ ${perm}`;
                if (!nowAllowed && !nowDenied && (wasAllowed || wasDenied)) return `⚪ ${perm} (reset)`;
                return `⚪ ${perm}`;
            })
            .join('\n');

        return {
            name: `Updated for ${update.perm.type === 1 ? 'User' : 'Role'}`,
            value: `**Target:** ${target}\n${changedPermissions}`,
            inline: false
        };
    });

    // Create and send embed
    const embed = new EmbedBuilder()
        .setColor(0x3498DB) // Blue for updates
        .setTitle('Channel Permissions Updated')
        .setDescription(
            `**Responsible:** ${responsible}\n` +
            `**Channel:** ${newChannel.toString()}\n` +
            `**Timestamp:** <t:${Math.floor(Date.now()/1000)}:F>`
        )
        .addFields(permissionFields);

    await new WebhookClient({ url: webhookUrl }).send({
        embeds: [embed],
        username: 'PixelBound\'s Utilities',
        avatarURL: client.user.displayAvatarURL()
    });
}