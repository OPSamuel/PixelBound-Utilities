const { SlashCommandBuilder, PermissionFlagsBits, WebhookClient, EmbedBuilder } = require('discord.js');
const { logs } = require('../../data/Webhooks');

// Helper function to parse duration strings
const parseDuration = (input) => {
    const match = input.match(/^(\d+)(m|h|d|w)$/);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 'm': return value * 60 * 1000; // Minutes to milliseconds
        case 'h': return value * 60 * 60 * 1000; // Hours to milliseconds
        case 'd': return value * 24 * 60 * 60 * 1000; // Days to milliseconds
        case 'w': return value * 7 * 24 * 60 * 60 * 1000; // Weeks to milliseconds
        default: return null;
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mutes a member in the server for a specified duration.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to mute')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Duration of the mute (e.g., 1m, 1h, 1d, 1w) (28d max)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the mute')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const target = interaction.options.getUser('target');
        const durationInput = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const member = interaction.guild.members.cache.get(target.id);

        const duration = parseDuration(durationInput); // Parse duration from shorthand format

        if (!duration) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Invalid Duration')
                .setDescription('Please provide a valid duration (e.g., 1m, 1h, 1d, 1w).')
                .setColor(0xFF0000);
            return interaction.editReply({ embeds: [embed] });
        }

        if (!member) {
            const embed = new EmbedBuilder()
                .setTitle('❌ User Not Found')
                .setDescription('The specified user is not in this server.')
                .setColor(0xFF0000);
            return interaction.editReply({ embeds: [embed] });
        }

        if (!member.moderatable) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Cannot Mute User')
                .setDescription('I cannot mute this user. They might have a higher role or I lack permissions.')
                .setColor(0xFF0000);
            return interaction.editReply({ embeds: [embed] });
        }

        try {
            // Apply timeout to the user
            await member.timeout(duration, reason);

            // Notify the staff member
            const embed = new EmbedBuilder()
                .setTitle('✅ Mute Successful')
                .setDescription(`Successfully muted **${target.tag}**.`)
                .addFields(
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'Duration', value: `${durationInput}`, inline: true }
                )
                .setColor(0x00FF00);
            await interaction.editReply({ embeds: [embed] });

            // Log to webhook
            if (typeof logs === 'string' && logs.startsWith('https://discord.com/api/webhooks/')) {
                try {
                    const webhookClient = new WebhookClient({ url: logs });
                    const logEmbed = new EmbedBuilder()
                        .setTitle('🚨 User Muted')
                        .setDescription('A user has been muted in the server.')
                        .addFields(
                            { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                            { name: 'Reason', value: reason, inline: true },
                            { name: 'Duration', value: `${durationInput}`, inline: true },
                            { name: 'Muted By', value: `${interaction.user.tag} (${interaction.user.id})`, inline: false }
                        )
                        .setThumbnail(target.displayAvatarURL())
                        .setColor(0xFFA500)
                        .setTimestamp();
                    await webhookClient.send({ embeds: [logEmbed] });
                } catch (webhookError) {
                    console.error('Webhook Error:', webhookError);
                }
            }

            // Notify the muted user via DM
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🚨 You Have Been Muted')
                    .setDescription(`You have been muted in **${interaction.guild.name}**.`)
                    .addFields(
                        { name: 'Reason', value: reason, inline: true },
                        { name: 'Duration', value: `${durationInput}`, inline: true }
                    )
                    .setColor(0xFFA500)
                    .setTimestamp();
                await target.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                console.error('Failed to send DM:', dmError);
            }
        } catch (error) {
            console.error('Mute Error:', error);
            const embed = new EmbedBuilder()
                .setTitle('❌ Mute Failed')
                .setDescription('Failed to mute the user. Please check my permissions and try again.')
                .setColor(0xFF0000);
            await interaction.editReply({ embeds: [embed] });
        }
    },
};
