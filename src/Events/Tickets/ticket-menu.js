const { Events, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, client } = require('discord.js');
const config = require('../../config.json');
const { createTranscript } = require('discord-html-transcripts'); // Import the transcript package
const applicationTypes = require('../../data/applicationquestions');
const followUpProgress = new Map(); // Store follow-up question progress
const { saveProgress, getProgress } = require('./followUpStorage');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: true }).catch((error) => console.log(error));
        }
        // Handle ticket dropdown selection
        if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_dropdown') {

            const TicketCategory = interaction.guild.channels.cache.get('1353384018434986064');
            const ticketChannel1 = TicketCategory.children.cache.find(channel => {
                return channel.topic?.includes(`Ticket created by ${interaction.user.id}`);
            });

            
            if (!TicketCategory) {
                return;
            }
    
            if (!ticketChannel1) {
            const selectedValue = interaction.values[0];
        
            const optionLabels = {
                general_support: 'General Support',
                game_issue: 'Game Issue',
                discord_issue: 'Discord Issues',
                staff_app: 'Staff Applications',
            };
        
            const selectedLabel = optionLabels[selectedValue] || 'Unknown Option';
        
            const followupembed = new EmbedBuilder()
                .setColor('#fc7a23')
                .setTitle('🎟️ Ticket System - PixelBound Entertainment')
                .setDescription('Your ticket is being created. Please wait while we process your request.')
                .addFields(
                    {
                        name: 'Selected Option',
                        value: `**${selectedLabel}**`,
                        inline: true,
                    },
                    {
                        name: 'What Happens Next?',
                        value: 'A staff member will be with you shortly. Please provide as much detail as possible about your issue in the ticket.',
                        inline: false,
                    },
                )
                .setFooter({
                    text: 'PixelBound Entertainment - Ticket System',
                    iconURL: 'https://cdn.discordapp.com/attachments/1188570570288275600/1353296064928813127/cb3ba39c559e8033534fddcc375a658b.png',
                })
                .setTimestamp();

                const originalMessage = await interaction.channel.messages.fetch(interaction.message.id);

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
    
                await originalMessage.edit({
                    components: [dropdown],
                });

            await interaction.reply({ embeds: [followupembed], ephemeral: true });
        
            const ticketCategoryId = '1353384018434986064'; // Replace with your ticket category ID
            const category = interaction.guild.channels.cache.get(ticketCategoryId);
        
            if (!category) {
                return interaction.followUp({
                    content: 'Ticket category not found. Please contact an admin.',
                    ephemeral: true,
                });
            }
        
            const ticketChannel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: 0, // Text channel
                parent: category,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                        allow: [PermissionsBitField.Flags.SendMessages],
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: config.STAFF_ROLE_ID, // Use STAFF_ROLE_ID from config
                        allow: [PermissionsBitField.Flags.ViewChannel],
                    },
                ],
                topic: `Ticket created by ${interaction.user.id}`, // Store the user ID in the channel topic
            });
        
            await interaction.followUp({
                content: `Your ticket has been created: ${ticketChannel}`,
                ephemeral: true,
            });
        
            // Send a DM to the user with an embed
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#fc7a23')
                    .setTitle('🎟️ Your Ticket Has Been Created')
                    .setDescription('Thank you for reaching out to PixelBound Entertainment! Here’s some information about your ticket:')
                    .addFields(
                        {
                            name: 'Ticket Channel',
                            value: `${ticketChannel}`,
                            inline: false,
                        },
                        {
                            name: 'What to Do Next',
                            value: '1. Go to the ticket channel above.\n2. Provide a detailed description of your issue or request.\n3. Include any relevant screenshots, error messages, or logs.\n4. Wait for a staff member to assist you.',
                            inline: false,
                        },
                        {
                            name: 'Response Time',
                            value: 'Our team aims to respond within **2 hours**. Thank you for your patience!',
                            inline: false,
                        },
                    )
                    .setFooter({
                        text: 'PixelBound Entertainment - Ticket System',
                        iconURL: 'https://cdn.discordapp.com/attachments/1188570570288275600/1353296064928813127/cb3ba39c559e8033534fddcc375a658b.png',
                    })
                    .setTimestamp();
        
                await interaction.user.send({ embeds: [dmEmbed] });
            } catch (error) {
                await interaction.followUp({
                    content: 'I was unable to send you a DM. Please ensure your DMs are open.',
                    ephemeral: true,
                });
            }
        
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#fc7a23')
                .setTitle(`🎟️ Welcome to your ticket, ${interaction.user.username}!`)
                .setDescription('A staff member will be with you shortly. To help us assist you better, please provide the following information:')
                .addFields(
                    {
                        name: '📝 What to Include',
                        value: '- A clear description of your issue or request.\n- Any relevant screenshots, error messages, or logs.\n- Steps to reproduce the issue (if applicable).',
                        inline: false,
                    },
                    {
                        name: '⏳ Response Time',
                        value: 'Our team aims to respond within **24 hours**. Thank you for your patience!',
                        inline: false,
                    },
                )
                .setFooter({
                    text: 'PixelBound Entertainment - Ticket System',
                    iconURL: 'https://cdn.discordapp.com/attachments/1188570570288275600/1353296064928813127/cb3ba39c559e8033534fddcc375a658b.png',
                })
                .setTimestamp();
        
            // Create staff buttons
            const staffButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('ticket_info')
                    .setLabel('Ticket Information')
                    .setStyle(ButtonStyle.Primary),
            );
        
            if (selectedValue !== 'staff_app') {
                await ticketChannel.send({
                    content: `${interaction.user}`,
                    embeds: [welcomeEmbed],
                    components: [staffButtons],
                });
            }
        
            // Define the global footer for additionalEmbed
            const globalFooter = {
                text: 'PixelBound Entertainment - Ticket System',
                iconURL: 'https://cdn.discordapp.com/attachments/1188570570288275600/1353296064928813127/cb3ba39c559e8033534fddcc375a658b.png',
            };
        
            let additionalEmbed;
            switch (selectedValue) {
                case 'general_support':
                    additionalEmbed = new EmbedBuilder()
                        .setColor('#fc7a23')
                        .setTitle('🛠️ General Support')
                        .setDescription('Our support team is here to help! Please provide the following details:')
                        .addFields(
                            {
                                name: '🔍 Issue Description',
                                value: 'Describe your issue in detail. Include any error messages, screenshots, or steps to reproduce the issue.',
                                inline: false,
                            },
                            {
                                name: '📅 When Did It Occur?',
                                value: 'Let us know when the issue started and how often it happens.',
                                inline: false,
                            },
                            {
                                name: '💡 Additional Information',
                                value: 'Any other details that might help us resolve your issue faster.',
                                inline: false,
                            },
                        )
                        .setFooter(globalFooter) // Use the global footer
                        .setTimestamp();
                    break;
        
                case 'game_issue':
                    additionalEmbed = new EmbedBuilder()
                        .setColor('#fc7a23')
                        .setTitle('🎮 Game Issue')
                        .setDescription('Our team will investigate your game-related issue. Please provide the following information:')
                        .addFields(
                            {
                                name: '🔍 Issue Description',
                                value: 'Describe the issue you are experiencing. Include details such as:\n- What happened?\n- When did it occur?\n- Any error messages or codes?',
                                inline: false,
                            },
                            {
                                name: '🖼️ Screenshots/Logs',
                                value: 'If possible, attach screenshots or logs that show the issue.',
                                inline: false,
                            },
                            {
                                name: '🕹️ Steps to Reproduce',
                                value: 'Explain how we can reproduce the issue on our end.',
                                inline: false,
                            },
                        )
                        .setFooter(globalFooter) // Use the global footer
                        .setTimestamp();
                    break;
        
                case 'discord_issue':
                    additionalEmbed = new EmbedBuilder()
                        .setColor('#fc7a23')
                        .setTitle('📜 Discord Issues')
                        .setDescription('We will address your Discord-related issue. Please provide the following details:')
                        .addFields(
                            {
                                name: '🔍 Issue Description',
                                value: 'Describe the problem you are facing on our Discord server. Include details such as:\n- What is the issue?\n- Who is involved?\n- Any screenshots or evidence?',
                                inline: false,
                            },
                            {
                                name: '📅 When Did It Occur?',
                                value: 'Let us know when the issue started and how often it happens.',
                                inline: false,
                            },
                            {
                                name: '👤 Involved Users',
                                value: 'Mention any users involved in the issue (if applicable).',
                                inline: false,
                            },
                        )
                        .setFooter(globalFooter) // Use the global footer
                        .setTimestamp();
                    break;
        
                case 'staff_app':
                    additionalEmbed = new EmbedBuilder()
                        .setColor('#fc7a23')
                        .setTitle('👔 Staff Applications')
                        .setDescription('Thank you for your interest in joining our team! Please select the role you want to apply for:')
                        .setFooter(globalFooter)
                        .setTimestamp();
        
                    // Create a select menu for staff roles
                    const staffRoleMenu = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('app_role_select')
                            .setPlaceholder('Select a role to apply for...')
                            .addOptions(
                                {
                                    label: 'PixelBound Modeller',
                                    value: 'modeller',
                                    description: 'Apply for the Modeller role.',
                                    emoji: '<:Icons_rhelpers:888881202369552474>',
                                },
                                {
                                    label: 'PixelBound Builder',
                                    value: 'builder',
                                    description: 'Apply for the Builder role.',
                                    emoji: '<:Icons_radmins:888881202382118922>',
                                },
                                {
                                    label: 'PixelBound Scripter',
                                    value: 'scripter',
                                    description: 'Apply for the Scripter role.',
                                    emoji: '<:Icons_rdevelopers:889125916922511420>',
                                },
                                {
                                    label: 'PixelBound Animator',
                                    value: 'animator',
                                    description: 'Apply for the Animator role.',
                                    emoji: '<:Icons_rVIP:888881201199329311>',
                                },
                                {
                                    label: 'Trial Moderator',
                                    value: 'trialmoderator',
                                    description: 'Apply for the Trial Moderator role.',
                                    emoji: '<:Icons_rmods:888881201354514522>',
                                },
                                {
                                    label: 'Project Manager',
                                    value: 'projectmanager',
                                    description: 'Apply for the Project Manager role.',
                                    emoji: '<:Icons_rguardians:888881201128013867>',
                                },
                                {
                                    label: 'Social Media Manager',
                                    value: 'socialmediamanager',
                                    description: 'Apply for the Social Media Manager role.',
                                    emoji: '<:Icons_rguardians:888881201128013867>',
                                },
                            ),
                    );

                    const staffButtons = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('close_ticket')
                            .setLabel('Close Ticket')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId('ticket_info')
                            .setLabel('Ticket Information')
                            .setStyle(ButtonStyle.Primary),
                    );
        
                    await ticketChannel.send({
                        content: `${interaction.user}`,
                        embeds: [additionalEmbed],
                        components: [staffRoleMenu, staffButtons],
                    });
                    break;
        
                default:
                    additionalEmbed = new EmbedBuilder()
                        .setColor('#fc7a23')
                        .setTitle('❓ Unknown Option')
                        .setDescription('An unknown option was selected. Please contact an admin for assistance.')
                        .setFooter(globalFooter)
                        .setTimestamp();
                    break;
            }
        
            if (selectedValue !== 'staff_app') {
                await ticketChannel.send({ embeds: [additionalEmbed] });
            }
   
        }else {
            interaction.reply({ content: `You already have a ticket open! Head over to it: <#${ticketChannel1.id}>`, ephemeral: true})

            const originalMessage = await interaction.channel.messages.fetch(interaction.message.id);

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

            await originalMessage.edit({
                components: [dropdown],
            });
        }
    }

        // Handle application role selection
        if (interaction.isStringSelectMenu() && interaction.customId === 'app_role_select') {
            const userId = interaction.channel.topic.replace('Ticket created by ', '');
            const ticketCreator = interaction.guild.members.cache.get(userId);

            if (interaction.user.id === ticketCreator.id) {
                const selectedRole = interaction.values[0];

                // Check if the selected role is valid
                if (!applicationTypes[selectedRole]) {
                    return interaction.reply({
                        content: 'Invalid role selected. Please try again.',
                        ephemeral: true,
                    });
                }

                
                const originalMessage = await interaction.channel.messages.fetch(interaction.message.id);

                const staffRoleMenuDisabled = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('app_role_select')
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
                        )
                        .setPlaceholder(`You chose to apply for ${selectedRole}`)
                        .setDisabled(true)
                );

                const staffButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('Close Ticket')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('ticket_info')
                        .setLabel('Ticket Information')
                        .setStyle(ButtonStyle.Primary),
                );

                await originalMessage.edit({components: [staffRoleMenuDisabled, staffButtons]})


                // Create an embed explaining the application process
                const processEmbed = new EmbedBuilder()
                    .setColor('#fc7a23')
                    .setTitle(`👔 ${applicationTypes[selectedRole].role} Application Process`)
                    .setDescription(`Thank you for applying for the **${applicationTypes[selectedRole].role}** role! Here’s how the application process works:`)
                    .addFields(
                        {
                            name: '1. Application Submission',
                            value: 'Submit your application by filling out the required information. Make sure to provide detailed and accurate answers.',
                            inline: false,
                        },
                        {
                            name: '2. Application Review',
                            value: 'Our team will carefully review your application to ensure it meets our requirements and standards.',
                            inline: false,
                        },
                        {
                            name: '3. Decision',
                            value: 'Once the review is complete, we will notify you of the outcome. If approved, you will receive further instructions on how to proceed.',
                            inline: false,
                        },
                    )
                    .setFooter({
                        text: 'PixelBound Entertainment - Staff Applications',
                        iconURL: 'https://cdn.discordapp.com/attachments/1188570570288275600/1353296064928813127/cb3ba39c559e8033534fddcc375a658b.png',
                    })
                    .setTimestamp();

                // Add the "Apply" button
                const applyButton = new ButtonBuilder()
                    .setCustomId(`apply_${selectedRole}`) // Use a custom ID to identify the role
                    .setLabel('Apply')
                    .setStyle(ButtonStyle.Primary);

                const apply = new ActionRowBuilder().addComponents(applyButton);

                // Reply with the embed and button
                await interaction.reply({
                    content: `${interaction.user}, here’s how the application process for the **${applicationTypes[selectedRole].role}** role works:`,
                    embeds: [processEmbed],
                    components: [apply],
                    ephemeral: true,
                });
            } else {
                await interaction.reply({
                    content: `Only the user who opened the ticket can interact with the menu.`,
                    ephemeral: true,
                });
            }
        }

        // Handle "Apply" button clicks
        if (interaction.isButton() && interaction.customId.startsWith('apply_')) {
            const selectedRole = interaction.customId.replace('apply_', ''); // Extract the role from the custom ID

            // Check if the selected role is valid
            if (!applicationTypes[selectedRole]) {
                return interaction.reply({
                    content: 'Invalid role selected. Please try again.',
                    ephemeral: true,
                });
            }

            // Create the modal for the selected role
            const modal = new ModalBuilder()
                .setCustomId(`application_form_${selectedRole}`)
                .setTitle(`${applicationTypes[selectedRole].role} Application Form`);

            // Add the questions to the modal
            applicationTypes[selectedRole].questions.forEach((question) => {
                const input = new TextInputBuilder()
                    .setCustomId(question.id)
                    .setLabel(question.label)
                    .setStyle(question.style)
                    .setMaxLength(1000) // Limit to 1000 characters
                    .setRequired(question.required);

                const row = new ActionRowBuilder().addComponents(input);
                modal.addComponents(row);
            });

            // Show the modal to the user
            await interaction.showModal(modal);
            await interaction.channel.send({content: "User is currently completing the application."})
        }

        // Handle modal submissions
        if (interaction.isModalSubmit() && interaction.customId.startsWith('application_form_')) {
            const selectedRole = interaction.customId.replace('application_form_', '');
            
            // Check if the selected role is valid
            if (!applicationTypes[selectedRole]) {
                return interaction.reply({
                    content: 'Invalid role selected. Please try again.',
                    ephemeral: true,
                });
            }
        
            // Collect input values
            const inputs = {};
            applicationTypes[selectedRole].questions.forEach((question) => {
                inputs[question.id] = interaction.fields.getTextInputValue(question.id) || 'Not provided';
            });
        
            // Create embeds for the user
            const userEmbed = new EmbedBuilder()
                .setColor('#fc7a23')
                .setTitle('🎟️ Application Received')
                .setDescription('Thank you for submitting your application! Here are the details you provided:')
                .addFields(
                    ...applicationTypes[selectedRole].questions.map((question) => ({
                        name: question.label,
                        value: inputs[question.id],
                        inline: false,
                    })),
                )
                .setFooter({
                    text: 'PixelBound Entertainment - Staff Applications',
                    iconURL: 'https://cdn.discordapp.com/attachments/1188570570288275600/1353296064928813127/cb3ba39c559e8033534fddcc375a658b.png',
                })
                .setTimestamp();
        
            await interaction.reply({
                content: 'Your application has been submitted!',
            });
        
            // Notify the user about follow-up questions
            await interaction.channel.send({
                content: `${interaction.user} please stay in this channel. There will be more follow-up questions for you to answer.`,
            });
        
            // Start follow-up questions
            const followUpQuestions = applicationTypes[selectedRole].followUpQuestions;
            if (followUpQuestions.length > 0) {
                // Save to persistent storage instead of memory
                saveProgress(interaction.user.id, {
                    role: selectedRole,
                    step: 0, // Start with the first follow-up question
                    answers: {}, // Store follow-up answers
                    originalAnswers: inputs, // Store original application answers
                });
        
                // Ask the first follow-up question
                const firstQuestion = followUpQuestions[0];
                const embed = new EmbedBuilder()
                    .setColor('#fc7a23')
                    .setTitle(`Followup Question (1/${followUpQuestions.length})`)
                    .setDescription(`${firstQuestion.label}`)
                    .setFooter({
                        text: 'PixelBound Entertainment - Ticket System',
                        iconURL: 'https://cdn.discordapp.com/attachments/1188570570288275600/1353296064928813127/cb3ba39c559e8033534fddcc375a658b.png',
                    })
                    .setTimestamp();
        
                await interaction.channel.send({
                    embeds: [embed],
                });
            }
        
            // Create embeds for the logs channel
            const logsEmbed = new EmbedBuilder()
                .setColor('#fc7a23')
                .setTitle(`📄 Application from ${interaction.user.tag}`)
                .setDescription(`**Role Applied For:** ${applicationTypes[selectedRole].role}`)
                .addFields(
                    ...applicationTypes[selectedRole].questions.map((question) => ({
                        name: question.label,
                        value: inputs[question.id],
                        inline: false,
                    })),
                )
                .setFooter({
                    text: 'PixelBound Entertainment - Staff Applications',
                    iconURL: 'https://cdn.discordapp.com/attachments/1188570570288275600/1353296064928813127/cb3ba39c559e8033534fddcc375a658b.png',
                })
                .setTimestamp();
        }
        // Handle Close Ticket and Ticket Info Buttons 
        if (interaction.isButton()) {
            if (interaction.customId === 'close_ticket') {
                // Check if the user has the required role
                const staffRole = interaction.guild.roles.cache.get(config.STAFF_ROLE_ID); // Use STAFF_ROLE_ID from config
                if (!interaction.member.roles.cache.has(staffRole.id)) {
                    return interaction.reply({
                        content: 'You do not have permission to close this ticket.',
                        ephemeral: true,
                    });
                }
            
                // Generate a transcript using discord-html-transcripts
                const transcript = await createTranscript(interaction.channel, {
                    limit: -1, // No limit
                    returnType: 'attachment', // Return as a file attachment
                    filename: `${interaction.channel.name}-transcript.html`, // Custom filename
                });
            
                // Fetch the user ID from the channel topic
                const userId = interaction.channel.topic.replace('Ticket created by ', '');
                const ticketCreator = interaction.guild.members.cache.get(userId);
            
                // Send the transcript to the logs channel
                const logsChannel = interaction.guild.channels.cache.get('1353384132675244127'); // Replace with your logs channel ID
                if (logsChannel) {
                    await logsChannel.send({
                        content: `Transcript for ${interaction.channel.name}:`,
                        files: [transcript],
                    });
                }
            
                // Send an embed to the user in DMs with the transcript
                if (ticketCreator) {
                    try {
                        const closeEmbed = new EmbedBuilder()
                            .setColor('#fc7a23')
                            .setTitle('🎟️ Your Ticket Has Been Closed')
                            .setDescription('Thank you for reaching out to PixelBound Entertainment! Your ticket has been closed. Below is a transcript of your ticket for your records.')
                            .addFields(
                                {
                                    name: 'Ticket Channel',
                                    value: `${interaction.channel.name}`,
                                    inline: false,
                                },
                                {
                                    name: 'Closed By',
                                    value: `${interaction.member.user.tag} (ID: ${interaction.member.id})`,
                                    inline: false,
                                },
                                {
                                    name: 'Closed At',
                                    value: new Date().toLocaleString('en-GB', { 
                                        timeZone: 'Europe/London', 
                                        hour12: false,  // 24-hour format (14:30 instead of 2:30 PM)
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }),
                                    inline: false,
                                }
                            )
                            .setFooter({
                                text: 'PixelBound Entertainment - Ticket System',
                                iconURL: 'https://cdn.discordapp.com/attachments/1188570570288275600/1353296064928813127/cb3ba39c559e8033534fddcc375a658b.png',
                            })
                            .setTimestamp();
            
                        await ticketCreator.send({
                            embeds: [closeEmbed],
                        });
                        await ticketCreator.send({
                            files: [transcript], 
                        });
                    } catch (error) {
                        await interaction.reply({
                            content: 'I was unable to send a DM to the ticket creator. They may have DMs disabled.',
                            ephemeral: true,
                        });
                    }
                }
            
                // Send an embed in the ticket channel indicating the ticket is closed
                const closeChannelEmbed = new EmbedBuilder()
                    .setColor('#fc7a23')
                    .setTitle('🎟️ Ticket Closed')
                    .setDescription('This ticket has been closed. The channel will be deleted in **30 seconds**.')
                    .addFields(
                        {
                            name: 'Closed By',
                            value: `${interaction.member.user.tag} (ID: ${interaction.member.id})`,
                            inline: false,
                        },
                        {
                            name: 'Closed At',
                            value: new Date().toLocaleString('en-GB', { 
                                timeZone: 'Europe/London', 
                                hour12: false,  // 24-hour format (14:30 instead of 2:30 PM)
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            }),
                            inline: false,
                        }
                    )
                    .setFooter({
                        text: 'PixelBound Entertainment - Ticket System',
                        iconURL: 'https://cdn.discordapp.com/attachments/1188570570288275600/1353296064928813127/cb3ba39c559e8033534fddcc375a658b.png',
                    })
                    .setTimestamp();
            
                await interaction.channel.send({ embeds: [closeChannelEmbed] });
            
                // Lock the channel so no one can send messages
                await interaction.channel.permissionOverwrites.edit(interaction.guild.id, {
                    SendMessages: false,
                });
            
                // Delete the channel after 30 seconds
                setTimeout(async () => {
                    try {
                        await interaction.channel.delete();
                    } catch (error) {

                    }
                }, 30000); // 30 seconds delay
            }
            if (interaction.customId === 'ticket_info') {
                const staffRole = interaction.guild.roles.cache.get(config.STAFF_ROLE_ID); // Use STAFF_ROLE_ID from config
                if (!interaction.member.roles.cache.has(staffRole.id)) {
                    return interaction.reply({
                        content: 'You do not have permission to view ticket information.',
                        ephemeral: true,
                    });
                }

                // Fetch the user ID from the channel topic
                const userId = interaction.channel.topic.replace('Ticket created by ', '');
                const ticketCreator = interaction.guild.members.cache.get(userId);

                if (!ticketCreator) {
                    return interaction.reply({
                        content: 'Unable to fetch ticket creator information.',
                        ephemeral: true,
                    });
                }

                // Send ticket information
                const ticketInfoEmbed = new EmbedBuilder()
                    .setColor('#fc7a23')
                    .setTitle('🎟️ Ticket Information')
                    .setDescription('Here’s some information about this ticket:')
                    .addFields(
                        {
                            name: 'Ticket Creator',
                            value: `${ticketCreator.user.tag} (ID: ${ticketCreator.id})`,
                            inline: true,
                        },
                        {
                            name: 'Account Creation Date',
                            value: ticketCreator.user.createdAt.toLocaleString(),
                            inline: true,
                        },
                        {
                            name: 'Join Date',
                            value: ticketCreator.joinedAt.toLocaleString(),
                            inline: true,
                        },
                        {
                            name: 'Ticket Channel',
                            value: interaction.channel.toString(),
                            inline: true,
                        },
                        {
                            name: 'Created At',
                            value: interaction.channel.createdAt.toLocaleString('en-GB', { 
                                timeZone: 'Europe/London', 
                                hour12: false,  // 24-hour format (14:30 instead of 2:30 PM)
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            }),
                            inline: true,
                        },
                        {
                            name: 'Ticket Age',
                            value: `${Math.floor((Date.now() - interaction.channel.createdAt) / 3600000)} hours`,
                            inline: true,
                        },
                    )
                    .setFooter({
                        text: 'PixelBound Entertainment - Ticket System',
                        iconURL: 'https://cdn.discordapp.com/attachments/1188570570288275600/1353296064928813127/cb3ba39c559e8033534fddcc375a658b.png',
                    })
                    .setTimestamp();

                await interaction.reply({
                    embeds: [ticketInfoEmbed],
                    ephemeral: true,
                });
            }           

            if (interaction.customId.startsWith('accept_') || interaction.customId.startsWith('deny_')) {
                try {
                    const [action, userId, role] = interaction.customId.split('_');
                    const staffMember = interaction.user;
                    
                    // 1. First update the application log (your existing code)
                    const originalLogsEmbed = interaction.message.embeds[0];
                    const updatedLogsEmbed = new EmbedBuilder()
                        .setTitle(originalLogsEmbed.title)
                        .setDescription(originalLogsEmbed.description)
                        .setColor(action === 'accept' ? '#00ff00' : '#ff0000')
                        .addFields(originalLogsEmbed.fields)
                        .setFooter({
                            text: action === 'accept' 
                                ? `✅ Accepted by ${staffMember.tag}` 
                                : `❌ Denied by ${staffMember.tag}`,
                            iconURL: originalLogsEmbed.footer?.iconURL
                        })
                        .setTimestamp();
            
                    const disabledButtons = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('accept_disabled')
                            .setLabel(action === 'accept' ? 'Accepted' : 'Accept')
                            .setStyle(action === 'accept' ? ButtonStyle.Success : ButtonStyle.Secondary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('deny_disabled')
                            .setLabel(action === 'deny' ? 'Denied' : 'Deny')
                            .setStyle(action === 'deny' ? ButtonStyle.Danger : ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
            
                    await interaction.update({ embeds: [updatedLogsEmbed], components: [disabledButtons] });
            
                    // 2. Find the ticket channel in the specified category
                    const TICKET_CATEGORY_ID = '1353384018434986064'; // Replace with your category ID
                    const category = interaction.guild.channels.cache.get(TICKET_CATEGORY_ID);
                    
                    if (!category) {
                        return;
                    }
            
                    // Find the ticket channel with matching user ID in topic
                    const ticketChannel = category.children.cache.find(channel => {
                        return channel.topic?.includes(`Ticket created by ${userId}`);
                    });
            
                    if (!ticketChannel) {
                        return;
                    }
            
                    // 3. Find and update the application message in the ticket channel
                    const ticketMessages = await ticketChannel.messages.fetch({ limit: 100 });
                    const applicationMessage = ticketMessages.find(msg => 
                        msg.embeds[0]?.title?.includes('Application') && 
                        msg.author.id === interaction.client.user.id
                    );
            
                    if (applicationMessage) {
                        const originalTicketEmbed = applicationMessage.embeds[0];
                        const updatedTicketEmbed = new EmbedBuilder()
                            .setTitle(originalTicketEmbed.title)
                            .setDescription(originalTicketEmbed.description)
                            .setColor(action === 'accept' ? '#00ff00' : '#ff0000')
                            .addFields(originalTicketEmbed.fields)
                            .setFooter({
                                text: action === 'accept' 
                                    ? '✅ Application Accepted' 
                                    : '❌ Application Denied',
                                iconURL: originalTicketEmbed.footer?.iconURL
                            })
                            .setTimestamp();
            
                        await applicationMessage.edit({ embeds: [updatedTicketEmbed] });
                    }
            
                    // 4. DM the applicant (your existing code)
                    const applicant = await interaction.guild.members.fetch(userId).catch(() => null);
                    if (applicant) {
                        try {
                            await applicant.send({
                                embeds: [new EmbedBuilder()
                                    .setTitle(action === 'accept' ? '🎉 Application Accepted' : '❌ Application Denied')
                                    .setDescription(getRoleSpecificMessage(role, action))
                                    .setColor(action === 'accept' ? '#00ff00' : '#ff0000')
                                    .setTimestamp()
                                ]
                            });

                            if (action === 'accept'){
                                await applicant.send({
                                    embeds: [new EmbedBuilder()
                                        .setTitle("📝 Trial Period Information")
                                        .setDescription("Congratulations on your acceptance! Before becoming a full member of our team, you'll need to complete a **1-week trial period**.")
                                        .addFields(
                                            {
                                                name: "What to Expect:",
                                                value: "• You'll be observed by senior staff\n• You'll complete training tasks\n• You'll receive constructive feedback"
                                            },
                                            {
                                                name: "Trial Requirements:",
                                                value: "• Maintain activity throughout the week\n• Follow all guidelines and instructions\n• Demonstrate your skills and professionalism to the best of your ability"
                                            },
                                            {
                                                name: "After Your Trial:",
                                                value: "• You'll receive a final evaluation\n• Successful candidates will be promoted\n• Feedback will be provided either way"
                                            }
                                        )
                                        .setColor('#FFA500') // Orange color for notice
                                        .setFooter({
                                            text: 'PixelBound Entertainment - Application System',
                                            iconURL: 'https://cdn.discordapp.com/attachments/1188570570288275600/1353296064928813127/cb3ba39c559e8033534fddcc375a658b.png',
                                        })
                                        .setTimestamp()
                                    ]
                                });    
                            }
                            // Role-specific message function
                            function getRoleSpecificMessage(role, action) {
                                const roleMessages = {
                                    'modeller': {
                                        accept: 'Congratulations and welcome to the PixelBound Development Team. Head over to ⁠<#1285660748445646889> to converse with other developers, and make sure you understand the rules of representing PixelBound. Make sure to be as active as possible in our server and games.',
                                        deny: 'Thank you for filing out an application, unfortunately we won\'t be needing your skills at PixelBound but wish you the best in the future, be sure to apply again in the future!'
                                    },
                                    'builder': {
                                        accept: 'Congratulations and welcome to the PixelBound Development Team. Head over to ⁠<#1285660748445646889> to converse with other developers, and make sure you understand the rules of representing PixelBound. Make sure to be as active as possible in our server and games.',
                                        deny: 'Thank you for filing out an application, unfortunately we won\'t be needing your skills at PixelBound but wish you the best in the future, be sure to apply again in the future!'
                                    },
                                    'scripter': {
                                        accept: 'Congratulations and welcome to the PixelBound Development Team. Head over to ⁠<#1285660748445646889> to converse with other developers, and make sure you understand the rules of representing PixelBound. Make sure to be as active as possible in our server and games.',
                                        deny: 'Thank you for filing out an application, unfortunately we won\'t be needing your skills at PixelBound but wish you the best in the future, be sure to apply again in the future!'
                                    },
                                    'animator': {
                                        accept: 'Congratulations and welcome to the PixelBound Development Team. Head over to ⁠<#1285660748445646889> to converse with other developers, and make sure you understand the rules of representing PixelBound. Make sure to be as active as possible in our server and games.',
                                        deny: 'Thank you for filing out an application, unfortunately we won\'t be needing your skills at PixelBound but wish you the best in the future, be sure to apply again in the future!',
                                    },
                                    'projectmanager': {
                                        accept: 'Congratulations and welcome to the PixelBound Development Team. Head over to ⁠<#1285660748445646889> to converse with other developers, and make sure you understand the rules of representing PixelBound. Make sure to be as active as possible in our server and games.',
                                        deny: 'Thank you for filing out an application, unfortunately we won\'t be needing your skills at PixelBound but wish you the best in the future, be sure to apply again in the future!'
                                    },
                                    'trialmoderator': {
                                        accept: 'Congratulations and welcome to the PixelBound Staff Team. Head over to ⁠<#1285659952710422579> and make sure you understand the rules of representing PixelBound. Make sure to be as active as possible in our server, and you can work your way up the ranks.\n\nThank you for filing out a application and welcome to the team! ',
                                        deny: 'Thanks for filing out an application, unfortunately we won\'t be accepting you, but if you would like to apply again in the future we would be more than happy to re-review your new application. '
                                    },
                                    'socialmediamanager': {
                                        accept: 'Congratulations and welcome to the PixelBound Team. DM <@710785866716545034>> ASAP to get started! Make sure you understand the rules of representing PixelBound, and make sure to be as active as possible in our server.',
                                        deny: 'Thank you for filing out an application, unfortunately we won\'t be needing your skills at PixelBound but wish you the best in the future, be sure to apply again in the future!',
                                    },
                                };
                            
                                // Default message if role not found
                                const defaultMessage = `Your ${applicationTypes[role]?.role || 'staff'} application has been ${action === 'accept' ? 'approved' : 'not approved'}.`;
                                
                                return roleMessages[role]?.[action] || defaultMessage;
                            }
                        } catch (err) {
                            ticketChannel.send({content: `${applicant}, I couldn't DM you. Your DM's Might be closed, sending the message here.`})
                            await ticketChannel.send({
                                embeds: [new EmbedBuilder()
                                    .setTitle(action === 'accept' ? '🎉 Application Accepted' : '❌ Application Denied')
                                    .setDescription(getRoleSpecificMessage(role, action))
                                    .setColor(action === 'accept' ? '#00ff00' : '#ff0000')
                                    .setTimestamp()
                                ]
                            });

                            if (action === 'accept'){
                                await ticketChannel.send({
                                    embeds: [new EmbedBuilder()
                                        .setTitle("📝 Trial Period Information")
                                        .setDescription("Congratulations on your acceptance! Before becoming a full member of our team, you'll need to complete a **1-week trial period**.")
                                        .addFields(
                                            {
                                                name: "What to Expect:",
                                                value: "• You'll be observed by senior staff\n• You'll complete training tasks\n• You'll receive constructive feedback"
                                            },
                                            {
                                                name: "Trial Requirements:",
                                                value: "• Maintain activity throughout the week\n• Follow all guidelines and instructions\n• Demonstrate your skills and professionalism to the best of your ability"
                                            },
                                            {
                                                name: "After Your Trial:",
                                                value: "• You'll receive a final evaluation\n• Successful candidates will be promoted\n• Feedback will be provided either way"
                                            }
                                        )
                                        .setColor('#FFA500') // Orange color for notice
                                        .setFooter({
                                            text: 'PixelBound Entertainment - Application System',
                                            iconURL: 'https://cdn.discordapp.com/attachments/1188570570288275600/1353296064928813127/cb3ba39c559e8033534fddcc375a658b.png',
                                        })
                                        .setTimestamp()
                                    ]
                                });    
                            }
                            
                            // Role-specific message function
                            function getRoleSpecificMessage(role, action) {
                                const roleMessages = {
                                    'modeller': {
                                        accept: 'Congratulations and welcome to the PixelBound Development Team. Head over to ⁠<#1285660748445646889> to converse with other developers, and make sure you understand the rules of representing PixelBound. Make sure to be as active as possible in our server and games.',
                                        deny: 'Thank you for filing out an application, unfortunately we won\'t be needing your skills at PixelBound but wish you the best in the future, be sure to apply again in the future!'
                                    },
                                    'builder': {
                                        accept: 'Congratulations and welcome to the PixelBound Development Team. Head over to ⁠<#1285660748445646889> to converse with other developers, and make sure you understand the rules of representing PixelBound. Make sure to be as active as possible in our server and games.',
                                        deny: 'Thank you for filing out an application, unfortunately we won\'t be needing your skills at PixelBound but wish you the best in the future, be sure to apply again in the future!'
                                    },
                                    'scripter': {
                                        accept: 'Congratulations and welcome to the PixelBound Development Team. Head over to ⁠<#1285660748445646889> to converse with other developers, and make sure you understand the rules of representing PixelBound. Make sure to be as active as possible in our server and games.',
                                        deny: 'Thank you for filing out an application, unfortunately we won\'t be needing your skills at PixelBound but wish you the best in the future, be sure to apply again in the future!'
                                    },
                                    'animator': {
                                        accept: 'Congratulations and welcome to the PixelBound Development Team. Head over to ⁠<#1285660748445646889> to converse with other developers, and make sure you understand the rules of representing PixelBound. Make sure to be as active as possible in our server and games.',
                                        deny: 'Thank you for filing out an application, unfortunately we won\'t be needing your skills at PixelBound but wish you the best in the future, be sure to apply again in the future!',
                                    },
                                    'projectmanager': {
                                        accept: 'Congratulations and welcome to the PixelBound Development Team. Head over to ⁠<#1285660748445646889> to converse with other developers, and make sure you understand the rules of representing PixelBound. Make sure to be as active as possible in our server and games.',
                                        deny: 'Thank you for filing out an application, unfortunately we won\'t be needing your skills at PixelBound but wish you the best in the future, be sure to apply again in the future!'
                                    },
                                    'trialmoderator': {
                                        accept: 'Congratulations and welcome to the PixelBound Staff Team. Head over to ⁠<#1285659952710422579> and make sure you understand the rules of representing PixelBound. Make sure to be as active as possible in our server, and you can work your way up the ranks.\n\nThank you for filing out a application and welcome to the team! ',
                                        deny: 'Thanks for filing out an application, unfortunately we won\'t be accepting you, but if you would like to apply again in the future we would be more than happy to re-review your new application. '
                                    },
                                    'socialmediamanager': {
                                        accept: 'Congratulations and welcome to the PixelBound Team. DM <@710785866716545034>> ASAP to get started! Make sure you understand the rules of representing PixelBound, and make sure to be as active as possible in our server.',
                                        deny: 'Thank you for filing out an application, unfortunately we won\'t be needing your skills at PixelBound but wish you the best in the future, be sure to apply again in the future!',
                                    },
                                };
                            
                                // Default message if role not found
                                const defaultMessage = `Your ${applicationTypes[role]?.role || 'staff'} application has been ${action === 'accept' ? 'approved' : 'not approved'}.`;
                                
                                return roleMessages[role]?.[action] || defaultMessage;
                        }
                    }

                        try {
                            await ticketChannel.permissionOverwrites.edit(userId, {
                                SendMessages: false,
                                AddReactions: false,
                                CreatePublicThreads: false,
                                CreatePrivateThreads: false,
                                SendMessagesInThreads: false
                            });
                            await ticketChannel.send({content: `This ticket can now be closed by a member of staff.`})
                        } catch (error) {
                            console.error(`Failed to update permissions for ${userId} in ${ticketChannel.name}:`, error);
                        }
                    }
            
                } catch (error) {
                    if (!interaction.replied) {
                        await interaction.followUp({ 
                            content: 'An error occurred while processing this application.', 
                            ephemeral: true 
                        });
                    }
                }
            }
        }
    },
    //Exporting applicationTypes and followUpProgress to use in handleFollowUpQuestions.js
    applicationTypes,
    followUpProgress,
};