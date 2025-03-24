const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { Events } = require('discord.js');
const applicationTypes = require('../data/applicationquestions');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        const ADMIN_USER_ID = '574217755692236803'; 

        if (message.author.id === ADMIN_USER_ID && message.content === 'pu!admin ticket-dashboard') {
            const embed = new EmbedBuilder()
            .setColor('#fc7a23')
                .setTitle('PixelBound Entertainment - Ticket System')
                .setDescription('Create a ticket to get help with issues, report bugs, or apply for a staff role—our team is here to assist you!')
                .setFooter({ iconURL: 'https://cdn.discordapp.com/attachments/1188570570288275600/1353296064928813127/cb3ba39c559e8033534fddcc375a658b.png?ex=67e122ac&is=67dfd12c&hm=5998f25fc4aa48e3a3c49005aabc7194085e5c403ca6baf8106aa16c8dc24f84&',         text: 'PixelBound Entertainment - Ticket System', });

            const dropdown = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_dropdown')
                    .setPlaceholder('Select your support enquiry...')
                    .addOptions(
                        {
                            label: 'General Support',
                            description: 'If you need general support.',
                            value: 'general_support', 
                            emoji: '<:helper:901415787519172649>',
                        },
                        {
                            label: 'Game Issue',
                            description: 'Data Loss, Bugs, Exploiters.',
                            value: 'game_issue', 
                            emoji: '<:Warning:1188296555640406076>',
                        },
                        {
                            label: 'Discord Issues',
                            description: 'Reporting Users, any other discord issues.',
                            value: 'discord_issue', 
                            emoji: '<:IL_Discord:957599524547878962>',
                        },
                        {
                            label: 'Staff Applications',
                            description: 'If you want to apply for staff, or a position within PixelBound Entertainment.',
                            value: 'staff_app', 
                            emoji: '<a:Applications:947867110946799656>',
                        },
                    ),
            );

            await message.channel.send({
                embeds: [embed],
                components: [dropdown],
            });
        }
    },
};