const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const Counting = require("../../Schemas/Counting");

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isStringSelectMenu()) return;
        if (interaction.customId !== 'counting-options') return;

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const selectedOption = interaction.values[0];

        try {
            let countingData = await Counting.findOne({ Guild_ID: guildId });

            switch (selectedOption) {
                case 'set_channel':
                    if (!countingData) {
                        countingData = await Counting.create({ 
                            Guild_Name: guildName,
                            Guild_ID: guildId,
                            Channel_ID: null,
                            Channel_Name: null,
                            CurrentCount: 0,
                            NextCount: 1,
                            LastUser_ID: null,
                            LastUser_Name: null,
                            SetBy: interaction.user.id,
                            SetAt: new Date()
                        });
                    }

                    await interaction.deferReply({ ephemeral: true });

                    const channelEmbed = new EmbedBuilder()
                        .setTitle('📌 Set Counting Channel')
                        .setDescription('Please mention the channel where counting should happen (e.g., `#counting`)')
                        .setColor(0x5865F2);

                    await interaction.editReply({
                        embeds: [channelEmbed],
                        ephemeral: true
                    });

                    const filter = m => m.author.id === interaction.user.id;
                    const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });

                    collector.on('collect', async m => {
                        const channel = m.mentions.channels.first();
                        if (!channel) {
                            await interaction.followUp({
                                content: 'No channel mentioned. Please try again.',
                                ephemeral: true
                            });
                            return;
                        }

                        countingData.Channel_ID = channel.id;
                        countingData.Channel_Name = channel.name;
                        countingData.SetBy = interaction.user.id;
                        countingData.SetAt = new Date();
                        await countingData.save();

                        await interaction.followUp({
                            content: `Counting channel set to ${channel}`,
                            ephemeral: true
                        });
                    });

                    collector.on('end', collected => {
                        if (collected.size === 0) {
                            interaction.followUp({
                                content: 'No response received. Channel setting timed out.',
                                ephemeral: true
                            });
                        }
                    });
                    break;

                case 'set_count':
                    if (!countingData) {
                        countingData = await Counting.create({ 
                            Guild_Name: guildName,
                            Guild_ID: guildId,
                            Channel_ID: null,
                            Channel_Name: null,
                            CurrentCount: 0,
                            NextCount: 1,
                            LastUser_ID: null,
                            LastUser_Name: null,
                            SetBy: interaction.user.id,
                            SetAt: new Date()
                        });
                    }

                    const modal = new ModalBuilder()
                        .setCustomId('counting-set-count')
                        .setTitle('Set Current Count');

                    const countInput = new TextInputBuilder()
                        .setCustomId('count-input')
                        .setLabel('What should the current count be?')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setPlaceholder('Enter a number (e.g., 100)');

                    const actionRow = new ActionRowBuilder().addComponents(countInput);
                    modal.addComponents(actionRow);

                    await interaction.showModal(modal);

                    try {
                        const modalSubmit = await interaction.awaitModalSubmit({
                            time: 60000,
                            filter: i => i.user.id === interaction.user.id && i.customId === 'counting-set-count'
                        });

                        const newCount = parseInt(modalSubmit.fields.getTextInputValue('count-input'));
                        if (isNaN(newCount)) {
                            await modalSubmit.reply({
                                content: 'That\'s not a valid number. Please try again.',
                                ephemeral: true
                            });
                            return;
                        }

                        countingData.CurrentCount = newCount;
                        countingData.NextCount = newCount + 1;
                        countingData.SetBy = interaction.user.id;
                        countingData.SetAt = new Date();
                        await countingData.save();

                        await modalSubmit.reply({
                            content: `Current count has been set to ${newCount} (next count will be ${newCount + 1})`,
                            ephemeral: true
                        });
                    } catch (error) {
                        if (!interaction.replied) {
                            await interaction.followUp({
                                content: 'Count setting timed out or was cancelled.',
                                ephemeral: true
                            });
                        }
                    }
                    break;

                case 'reset':
                    await interaction.deferReply({ ephemeral: true });

                    if (!countingData) {
                        return await interaction.editReply({
                            content: 'There\'s no counting system to reset in this server.',
                            ephemeral: true
                        });
                    }

                    countingData.CurrentCount = 0;
                    countingData.NextCount = 1;
                    countingData.LastUser_ID = null;
                    countingData.LastUser_Name = null;
                    countingData.SetBy = interaction.user.id;
                    countingData.SetAt = new Date();
                    await countingData.save();

                    await interaction.editReply({
                        content: 'Counting system has been reset! The count is now back to 0.',
                        ephemeral: true
                    });
                    break;

                case 'info':
                    await interaction.deferReply({ ephemeral: true });

                    if (!countingData) {
                        return await interaction.editReply({
                            content: 'This server has no counting system configured yet.',
                            ephemeral: true
                        });
                    }

                    const infoEmbed = new EmbedBuilder()
                        .setTitle('ℹ️ Counting System Information')
                        .setColor(0x5865F2)
                        .addFields(
                            {
                                name: '📌 Counting Channel',
                                value: countingData.Channel_ID ? `<#${countingData.Channel_ID}> (${countingData.Channel_Name})` : 'Not set',
                                inline: true
                            },
                            {
                                name: '🔢 Current Count',
                                value: countingData.CurrentCount?.toString() || '0',
                                inline: true
                            },
                            {
                                name: '⏭️ Next Count',
                                value: countingData.NextCount?.toString() || '1',
                                inline: true
                            },
                            {
                                name: '👑 Last User',
                                value: countingData.LastUser_ID ? `<@${countingData.LastUser_ID}> (${countingData.LastUser_Name})` : 'No one yet',
                                inline: true
                            },
                            {
                                name: '🛠️ Configured By',
                                value: countingData.SetBy ? `<@${countingData.SetBy}>` : 'Unknown',
                                inline: true
                            },
                            {
                                name: '🔄 Last Updated',
                                value: countingData.SetAt ? countingData.SetAt.toLocaleString() : 'Not available',
                                inline: true
                            }
                        )
                        .setFooter({
                            text: `Requested by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL()
                        });

                    await interaction.editReply({
                        embeds: [infoEmbed],
                        ephemeral: true
                    });
                    break;

                default:
                    await interaction.deferReply({ ephemeral: true });
                    await interaction.editReply({
                        content: 'Invalid option selected.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error handling counting menu:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: 'An error occurred while processing your request.',
                    ephemeral: true
                });
            } else {
                await interaction.followUp({
                    content: 'An error occurred while processing your request.',
                    ephemeral: true
                });
            }
        }
    }
};