const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits} = require('discord.js');
const applicationTypes = require('../../data/applicationquestions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('view-questions')
        .setDescription('View all application questions for all roles')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        await interaction.deferReply();
        if(interaction.user.id === '574217755692236803') {

            try {
                const embeds = [];
                
                // Create embeds for each role
                for (const roleData of Object.values(applicationTypes)) {
                    const embed = new EmbedBuilder()
                        .setColor('#fc7a23')
                        .setTitle(`${roleData.role} Questions`)
                        .addFields(
                            {
                                name: 'Main Questions',
                                value: roleData.questions.map(q => 
                                    `${q.label}`
                                ).join('\n\n'),
                                inline: false
                            },
                            {
                                name: 'Follow-up Questions',
                                value: roleData.followUpQuestions.map(q => 
                                    `${q.label}`
                                ).join('\n\n'),
                                inline: false
                            }
                        )
                        .setFooter({ text: `Role: ${roleData.role}` });

                    embeds.push(embed);
                }

                // Send all embeds in one message
                await interaction.editReply({ 
                    embeds: embeds,
                });

            } catch (error) {
                console.error(error);
                await interaction.editReply({ 
                    content: '❌ Failed to display questions', 
                    ephemeral: true 
                });
            }
        } 
    }
};