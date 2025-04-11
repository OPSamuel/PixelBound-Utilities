const { SlashCommandBuilder, PermissionFlagsBits, WebhookClient, EmbedBuilder } = require('discord.js');
const { logs } = require('../../data/Webhooks');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bans a member from the server.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDMPermission(false),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const member = interaction.guild.members.cache.get(target.id);

        // Permission checks
        if (!member) {
            const embed = new EmbedBuilder()
                .setTitle('❌ User Not Found')
                .setDescription('The specified user is not in this server.')
                .setColor(0xFF0000);
            return interaction.editReply({ embeds: [embed] });
        }

        if (!member.bannable) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Cannot Ban User')
                .setDescription('I cannot ban this user. They might have a higher role or I lack permissions.')
                .setColor(0xFF0000);
            return interaction.editReply({ embeds: [embed] });
        }

        if (interaction.user.id === target.id) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Self-Ban Attempt')
                .setDescription('You cannot ban yourself.')
                .setColor(0xFF0000);
            return interaction.editReply({ embeds: [embed] });
        }

        if (interaction.guild.ownerId === target.id) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Cannot Ban Server Owner')
                .setDescription('You cannot ban the server owner.')
                .setColor(0xFF0000);
            return interaction.editReply({ embeds: [embed] });
        }

        try {
            // Send a beautifully formatted DM to the member before banning them
            try {
                const embed = new EmbedBuilder()
                    .setTitle('🚨 You Have Been Banned')
                    .setDescription(`You have been banned from **${interaction.guild.name}**.`)
                    .addFields(
                        { name: 'Reason', value: reason, inline: false },
                        { name: 'Staff Member', value: `${interaction.user.tag}`, inline: false }
                    )
                    .setColor(0xFF0000)
                    .setTimestamp();
                await target.send({ embeds: [embed] });
            } catch (dmError) {
                console.error('Failed to send DM:', dmError);
            }

            // Ban the member
            await member.ban({ reason });

            // Confirm the ban to the command user with an embed
            const embed = new EmbedBuilder()
                .setTitle('✅ Ban Successful')
                .setDescription(`Successfully banned **${target.tag}**.`)
                .addFields({ name: 'Reason', value: reason, inline: false })
                .setColor(0x00FF00);
            await interaction.editReply({ embeds: [embed] });

            // Webhook logging (with validation) using a formatted embed
            if (typeof logs === 'string' && logs.startsWith('https://discord.com/api/webhooks/')) {
                try {
                    const webhookClient = new WebhookClient({ url: logs });
                    const embed = new EmbedBuilder()
                        .setTitle('🚨 User Banned')
                        .setDescription('A user has been banned from the server.')
                        .addFields(
                            { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                            { name: 'Reason', value: reason, inline: true },
                            { name: 'Banned By', value: `${interaction.user.tag} (${interaction.user.id})`, inline: false }
                        )
                        .setThumbnail(target.displayAvatarURL())
                        .setColor(0xFF0000)
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
            console.error('Ban Error:', error);
            const embed = new EmbedBuilder()
                .setTitle('❌ Ban Failed')
                .setDescription('Failed to ban the user. Please check my permissions and try again.')
                .setColor(0xFF0000);
            await interaction.editReply({ embeds: [embed] });
        }
    },
};
