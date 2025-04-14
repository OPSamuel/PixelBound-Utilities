const { SlashCommandBuilder, PermissionFlagsBits, WebhookClient, EmbedBuilder } = require('discord.js');
const { logs } = require('../../data/Webhooks');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban-id')
        .setDescription('Bans a user from the server by their ID.')
        .addStringOption(option =>
            option.setName('target')
                .setDescription('The user ID to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const targetId = interaction.options.getString('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Validate the ID format
        if (!/^\d{17,20}$/.test(targetId)) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Invalid ID')
                .setDescription('The provided ID is not a valid Discord user ID.')
                .setColor(0xFF0000);
            return interaction.editReply({ embeds: [embed] });
        }

        try {
            // Fetch the user (this works even if they're not in the server)
            const target = await interaction.client.users.fetch(targetId);
            
            // Check if the user is the command author
            if (interaction.user.id === target.id) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Self-Ban Attempt')
                    .setDescription('You cannot ban yourself.')
                    .setColor(0xFF0000);
                return interaction.editReply({ embeds: [embed] });
            }

            // Check if the user is the server owner
            if (interaction.guild.ownerId === target.id) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Cannot Ban Server Owner')
                    .setDescription('You cannot ban the server owner.')
                    .setColor(0xFF0000);
                return interaction.editReply({ embeds: [embed] });
            }

            // Try to send DM before banning
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
            }

            // Ban the user by ID
            await interaction.guild.bans.create(targetId, { reason });

            // Confirm the ban to the command user with an embed
            const embed = new EmbedBuilder()
                .setTitle('✅ Ban Successful')
                .setDescription(`Successfully banned **${target.tag}** (ID: ${target.id}).`)
                .addFields({ name: 'Reason', value: reason, inline: false })
                addFields({ name: 'Banned By', value: `${interaction.user.tag}`, inline: false })
                .setColor(0x00FF00);
            await interaction.editReply({ embeds: [embed] });

            // Webhook logging
            if (typeof logs === 'string' && logs.startsWith('https://discord.com/api/webhooks/')) {
                try {
                    const webhookClient = new WebhookClient({ url: logs });
                    const embed = new EmbedBuilder()
                        .setTitle('🚨 User Banned (by ID)')
                        .setDescription('A user has been banned from the server by their ID.')
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
            
            let errorMessage = 'Failed to ban the user. Please check my permissions and try again.';
            
            // Handle specific API errors
            if (error.code === 10013) { // Unknown User
                errorMessage = 'This user does not exist.';
            } else if (error.code === 50013) { // Missing Permissions
                errorMessage = 'I don\'t have permission to ban this user.';
            } else if (error.code === 50035) { // Invalid Form Body (usually invalid ID)
                errorMessage = 'The provided ID is not valid.';
            }
            
            const embed = new EmbedBuilder()
                .setTitle('❌ Ban Failed')
                .setDescription(errorMessage)
                .setColor(0xFF0000);
            await interaction.editReply({ embeds: [embed] });
        }
    },
};