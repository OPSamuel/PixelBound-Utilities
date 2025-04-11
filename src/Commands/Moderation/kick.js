const { SlashCommandBuilder, PermissionFlagsBits, WebhookClient, EmbedBuilder } = require('discord.js');
const { logs } = require('../../data/Webhooks'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kicks a member from the server.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to kick')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the kick')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .setDMPermission(false),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const member = interaction.guild.members.cache.get(target.id);

        if (!member) {
            const embed = new EmbedBuilder()
                .setTitle('❌ User Not Found')
                .setDescription('The specified user is not in this server.')
                .setColor(0xFF0000);
            return interaction.editReply({ embeds: [embed] });
        }

        if (!member.kickable) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Cannot Kick User')
                .setDescription('I cannot kick this user. They might have a higher role or I lack permissions.')
                .setColor(0xFF0000);
            return interaction.editReply({ embeds: [embed] });
        }

        try {
            // Send DM to the user
            try {
                const embed = new EmbedBuilder()
                    .setTitle('🚨 You Have Been Kicked')
                    .setDescription(`You have been kicked from **${interaction.guild.name}**.`)
                    .addFields(
                        { name: 'Reason', value: reason, inline: false },
                        { name: 'Kicked By', value: `${interaction.user.tag}`, inline: false }
                    )
                    .setColor(0xFFA500)
                    .setTimestamp();
                await target.send({ embeds: [embed] });
            } catch (dmError) {
                console.error('Failed to send DM:', dmError);
            }

            // Kick the member
            await member.kick(reason);

            // Confirm to the staff member
            const embed = new EmbedBuilder()
                .setTitle('✅ Kick Successful')
                .setDescription(`Successfully kicked **${target.tag}**.`)
                .addFields({ name: 'Reason', value: reason, inline: false })
                .setColor(0x00FF00);
            await interaction.editReply({ embeds: [embed] });

            // Log to webhook
            if (typeof logs === 'string' && logs.startsWith('https://discord.com/api/webhooks/')) {
                const webhookClient = new WebhookClient({ url: logs });
                const embed = new EmbedBuilder()
                    .setTitle('🚨 User Kicked')
                    .setDescription('A user has been kicked from the server.')
                    .addFields(
                        { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                        { name: 'Reason', value: reason, inline: true },
                        { name: 'Kicked By', value: `${interaction.user.tag} (${interaction.user.id})`, inline: false }
                    )
                    .setThumbnail(target.displayAvatarURL())
                    .setColor(0xFFA500)
                    .setTimestamp();
                await webhookClient.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Kick Error:', error);
            const embed = new EmbedBuilder()
                .setTitle('❌ Kick Failed')
                .setDescription('Failed to kick the user. Please check my permissions and try again.')
                .setColor(0xFF0000);
            await interaction.editReply({ embeds: [embed] });
        }
    },
};
