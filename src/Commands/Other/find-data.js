const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, codeBlock } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('find-data')
        .setDescription('Find user data in system files')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to search for')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('file')
                .setDescription('Which data file to check')
                .setRequired(true)
                .addChoices(
                    { name: 'Restricted Data', value: 'restricted' },
                    { name: 'Follow-up Questions', value: 'followup' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('user');
        const fileChoice = interaction.options.getString('file');

        try {
            // Determine which file to read
            const fileName = fileChoice === 'restricted' 
                ? 'restricted_data.json' 
                : 'followup_progress.json';
            
            const filePath = path.join(__dirname, '..', '..', 'data', 'Backups', fileName);

            // Check if file exists
            if (!fs.existsSync(filePath)) {
                return interaction.followUp({
                    content: `❌ File ${fileName} not found`,
                    ephemeral: true
                });
            }

            // Read and parse the file
            const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const userData = fileData[targetUser.id];

            if (!userData) {
                return interaction.followUp({
                    content: `❌ No ${fileName} data found for ${targetUser.tag}`,
                    ephemeral: true
                });
            }

            // Format the output
            const formattedData = JSON.stringify(userData, null, 2);
            const shortFileName = fileName.replace('.json', '');

            const embed = new EmbedBuilder()
                .setColor('#FFA500') // Orange color for notices
                .setTitle(`${targetUser.tag}'s ${shortFileName}`)
                .setDescription(codeBlock('json', formattedData.slice(0, 4000)))
                .addFields(
                    { name: 'File', value: fileName, inline: true },
                    { name: 'User ID', value: targetUser.id, inline: true }
                )
                .setFooter({ text: `Retrieved by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.followUp({ embeds: [embed] });

            // Send additional chunks if data is large
            if (formattedData.length > 4000) {
                for (let i = 4000; i < formattedData.length; i += 4000) {
                    await interaction.followUp({
                        content: codeBlock('json', formattedData.slice(i, i + 4000)),
                        ephemeral: true
                    });
                }
            }

        } catch (error) {
            console.error('Find data error:', error);
            await interaction.followUp({
                content: `❌ Error reading data: ${error.message}`,
                ephemeral: true
            });
        }
    }
};