const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('restricted-access-notice')
        .setDescription('Posts a detailed explanation about restriced accounts restrictions')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to post the notice in')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.options.getChannel('channel');

        // Verify the channel is text-based
        if (!channel.isTextBased()) {
            return interaction.followUp({
                content: "❌ Please select a text channel.",
                ephemeral: true
            });
        }

        try {
            const noticeEmbed = new EmbedBuilder()
                .setTitle('Restricted Accounts')
                .setColor('#FFA500') // Orange color for notices
                .setDescription('**Comprehensive information about account restrictions in this server:**')
                .addFields(
                    {
                        name: '🔹 Common Reasons for Restrictions',
                        value: 'Accounts may be limited due to:\n' +
                               '• 🕒 Being under 3 days old (new account protection)\n' +
                               '• 🔄 Similar IP/behavior to existing members\n' +
                               '• ⚠️ Previous violations on other accounts\n' +
                               '• 🤖 Suspicious bot-like activity patterns\n' +
                               '• 📍 High-risk geographic locations\n' +
                               '• 📉 Low server reputation from previous visits'
                    },
                    {
                        name: '🔹 Security Protections',
                        value: 'These restrictions help us:\n' +
                               '• 🛡️ Prevent spam and raid attacks\n' +
                               '• ⚖️ Maintain fair community participation\n' +
                               '• 🔍 Identify ban evaders\n' +
                               '• 🧑‍🤝‍🧑 Protect genuine members\' experience\n' +
                               '• 📊 Ensure accurate server analytics'
                    },
                    {
                        name: '🔹 Current Restrictions',
                        value: 'Limited accounts can only access:\n' +
                               '• 📜 Rules channel (read-only)\n' +
                               '• 🎫 Tickets channel (appeals only)\n' +
                               '• ℹ️ Basic server information\n\n' +
                               '❌ All other channels remain hidden'
                    },
                    {
                        name: '🔹 Restoration Process',
                        value: 'To regain full access:\n' +
                               '1. Open a ticket in the Discord Issue category\n' +
                               '2. Provide:\n' +
                               '   - Your main account (if applicable)\n' +
                               '   - Explanation of your situation\n' +
                               '3. Staff review typically takes 2-6 hours\n\n' +
                               '🚨 False appeals may result in permanent bans'
                    },
                    {
                        name: '🔹 Policy Highlights',
                        value: '• 🚫 One main account per person\n' +
                               '• ✔️ Alts must be registered with staff\n' +
                               '• ⏳ New accounts have 14-day probation\n' +
                               '• 🔄 Restrictions may update automatically\n' +
                               '• 📝 All decisions are logged and reviewed'
                    }
                )
                .setFooter({ text: `${interaction.guild.name} Security System • ${new Date().getFullYear()}` })
                .setThumbnail(interaction.guild.iconURL())
                .setTimestamp();

            await channel.send({ embeds: [noticeEmbed] });

            await interaction.followUp({
                content: `✅ Detailed restriction notice posted in ${channel}.`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Error posting notice:', error);
            await interaction.followUp({
                content: "❌ Failed to post notice. Please check:\n• Bot permissions\n• Channel access\n• Embed limits",
                ephemeral: true
            });
        }
    }
};