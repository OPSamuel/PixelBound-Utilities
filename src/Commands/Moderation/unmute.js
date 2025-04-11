const { SlashCommandBuilder, PermissionFlagsBits, WebhookClient, EmbedBuilder } = require('discord.js');
const { logs } = require('../../data/Webhooks'); // Webhook for logging

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Unmutes a member in the server.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to unmute')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) // ModerateMembers permission for managing timeouts
        .setDMPermission(false),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const target = interaction.options.getUser('target');
        const member = interaction.guild.members.cache.get(target.id);

        if (!member) {
            const embed = new EmbedBuilder()
                .setTitle('❌ User Not Found')
                .setDescription('The specified user is not in this server.')
                .setColor(0xFF0000);
            return interaction.editReply({ embeds: [embed] });
        }

        if (!member.communicationDisabledUntilTimestamp) {
            const embed = new EmbedBuilder()
                .setTitle('❌ User is Not Muted')
                .setDescription('The specified user does not have an active timeout.')
                .setColor(0xFF0000);
            return interaction.editReply({ embeds: [embed] });
        }

        try {
            // Remove the timeout
            await member.timeout(null); // Passing `null` removes the timeout immediately

            // Notify the staff member
            const embed = new EmbedBuilder()
                .setTitle('✅ Unmute Successful')
                .setDescription(`Successfully unmuted **${target.tag}**.`)
                .setColor(0x00FF00);
            await interaction.editReply({ embeds: [embed] });

            // Log to webhook
            if (typeof logs === 'string' && logs.startsWith('https://discord.com/api/webhooks/')) {
                try {
                    const webhookClient = new WebhookClient({ url: logs });
                    const logEmbed = new EmbedBuilder()
                        .setTitle('🚨 User Unmuted')
                        .setDescription('A user has been unmuted in the server.')
                        .addFields(
                            { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                            { name: 'Unmuted By', value: `${interaction.user.tag} (${interaction.user.id})`, inline: false }
                        )
                        .setThumbnail(target.displayAvatarURL())
                        .setColor(0x00FF00)
                        .setTimestamp();
                    await webhookClient.send({ embeds: [logEmbed] });
                } catch (webhookError) {
                    console.error('Webhook Error:', webhookError);
                }
            }

            // Notify the unmuted user via DM
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🎉 You Have Been Unmuted')
                    .setDescription(`Your timeout in **${interaction.guild.name}** has been lifted.`)
                    .setColor(0x00FF00)
                    .setTimestamp();
                await target.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                console.error('Failed to send DM:', dmError);
            }
        } catch (error) {
            console.error('Unmute Error:', error);
            const embed = new EmbedBuilder()
                .setTitle('❌ Unmute Failed')
                .setDescription('Failed to unmute the user. Please check my permissions and try again.')
                .setColor(0xFF0000);
            await interaction.editReply({ embeds: [embed] });
        }
    },
};
