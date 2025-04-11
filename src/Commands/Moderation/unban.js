const { SlashCommandBuilder, WebhookClient, EmbedBuilder } = require('discord.js');
const { logs } = require('../../data/Webhooks'); // Updated webhook name to `logs`

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unbans a member from the server.')
        .addStringOption(option =>
            option.setName('user_id')
                .setDescription('The ID of the user to unban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the unban')
                .setRequired(false)),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.options.getString('user_id');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            // Fetch the banned user
            const banList = await interaction.guild.bans.fetch();
            const bannedUser = banList.get(userId);

            if (!bannedUser) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ User Not Found')
                    .setDescription('The specified user is not banned in this server.')
                    .setColor(0xFF0000);
                return interaction.editReply({ embeds: [embed] });
            }

            // Unban the user
            await interaction.guild.bans.remove(userId, reason);

            // Notify the user via DM (if possible)
            try {
                const embed = new EmbedBuilder()
                    .setTitle('🎉 You Have Been Unbanned')
                    .setDescription(`You have been unbanned from **${interaction.guild.name}**.`)
                    .addFields(
                        { name: 'Reason', value: reason, inline: false },
                        { name: 'Unbanned By', value: `${interaction.user.tag}`, inline: false }
                    )
                    .setColor(0x00FF00)
                    .setTimestamp();
                await bannedUser.user.send({ embeds: [embed] });
            } catch (dmError) {
                console.error('Failed to send DM:', dmError);
            }

            // Confirm the unban to the staff member
            const embed = new EmbedBuilder()
                .setTitle('✅ Unban Successful')
                .setDescription(`Successfully unbanned **${bannedUser.user.tag}**.`)
                .addFields({ name: 'Reason', value: reason, inline: false })
                .setColor(0x00FF00);
            await interaction.editReply({ embeds: [embed] });

            // Webhook logging (if valid)
            if (typeof logs === 'string' && logs.startsWith('https://discord.com/api/webhooks/')) {
                try {
                    const webhookClient = new WebhookClient({ url: logs });
                    const embed = new EmbedBuilder()
                        .setTitle('🚨 User Unbanned')
                        .setDescription('A user has been unbanned from the server.')
                        .addFields(
                            { name: 'User', value: `${bannedUser.user.tag} (${bannedUser.user.id})`, inline: true },
                            { name: 'Reason', value: reason, inline: true },
                            { name: 'Unbanned By', value: `${interaction.user.tag} (${interaction.user.id})`, inline: false }
                        )
                        .setThumbnail(bannedUser.user.displayAvatarURL())
                        .setColor(0x00FF00)
                        .setTimestamp();

                    await webhookClient.send({
                        embeds: [embed],
                        username: interaction.client.user.username,
                        avatarURL: interaction.client.user.displayAvatarURL(),
                    });
                } catch (webhookError) {
                    console.error('Webhook Error:', webhookError);
                }
            } else {
                console.error('Invalid logs URL:', logs);
            }
        } catch (error) {
            console.error('Unban Error:', error);
            const embed = new EmbedBuilder()
                .setTitle('❌ Unban Failed')
                .setDescription('Failed to unban the user. Please ensure the user ID is correct and try again.')
                .setColor(0xFF0000);
            await interaction.editReply({ embeds: [embed] });
        }
    },
};
