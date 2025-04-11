const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const MILESTONES = require("../../data/CountingThresholds");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('counting-guide')
        .setDescription('Post a beautifully formatted counting guide embed')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        // Format role rewards section
        const rewardsList = Object.entries(MILESTONES)
            .sort((a, b) => a[0] - b[0])
            .map(([threshold, roleId]) => {
                const role = interaction.guild.roles.cache.get(roleId);
                return `▫️ **${Number(threshold).toLocaleString()} counts** → ${role ? role.toString() : 'Role not found'}`;
            })
            .join('\n');

        const guideEmbed = new EmbedBuilder()
            .setTitle('🔢  COUNTING GAME GUIDE  🔢')
            .setColor('#FFA500')
            .setDescription([
                '**━━━━━━━━━━━━━━━━━━━━━━━━━━━━**',
                '🌟 **Welcome to our Counting Challenge!** 🌟',
                'Collaborate to count as high as possible and earn special roles!',
                '**━━━━━━━━━━━━━━━━━━━━━━━━━━━━**'
            ].join('\n'))
            .addFields(
                {
                    name: '▬▬▬▬▬ HOW TO PLAY ▬▬▬▬▬',
                    value: [
                        '```asciidoc',
                        '1. » The game begins with "1"',
                        '2. » Next person posts "2", then "3", and so on',
                        '3. » Only one number per message',
                        '4. » Wait for someone else to count before you go again',
                        '```'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '▬▬▬▬▬ REWARD ROLES ▬▬▬▬▬',
                    value: rewardsList,
                    inline: false
                },
                {
                    name: '▬▬▬▬▬ RULES ▬▬▬▬▬',
                    value: [
                        '```diff',
                        '+ DO:',
                        '+ Follow the number sequence exactly',
                        '+ Wait your turn between counts',
                        '+ Keep it fun and friendly',
                        '',
                        '- DON\'T:',
                        '- Count consecutively (no back-to-back numbers)',
                        '- Skip numbers (no jumping ahead)',
                        '- Edit/delete your counts',
                        '- Use bots or external help',
                        '```'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '▬▬▬▬▬ EXAMPLES ▬▬▬▬▬',
                    value: [
                        '```diff',
                        '+ CORRECT:',
                        'UserA: "1"',
                        'UserB: "2"',
                        'UserC: "3"',
                        '',
                        '- INCORRECT:',
                        'UserA: "1" → UserA: "2" (same user)',
                        'UserB: "4" (skipped 3)',
                        'UserC: "five" (not numeric)',
                        '```'
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({ 
                text: `${interaction.guild.name} - Counting System`,
                iconURL: interaction.guild.iconURL() 
            });

        try {
            const message = await interaction.channel.send({ embeds: [guideEmbed] });
            await message.pin();
            
            await interaction.reply({
                content: '✨ Counting guide posted and pinned!',
                ephemeral: true
            });
        } catch (error) {
            console.error('Error posting guide:', error);
            await interaction.reply({
                content: '❌ Failed to post guide - check bot permissions',
                ephemeral: true
            });
        }
    }
};