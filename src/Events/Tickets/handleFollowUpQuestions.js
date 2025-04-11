const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { applicationTypes } = require('./ticket-menu');
const fs = require('fs');
const path = require('path');

// Configuration
const PROGRESS_FILE = path.join(__dirname, '..', '..', 'data', 'Backups', 'followup_progress.json');
const LOGS_CHANNEL_ID = '1353384761980358817';

// Helper functions
function truncateText(text, maxLength = 999) {
    return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
}

function ensureDataDirectory() {
    const dataDir = path.dirname(PROGRESS_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(PROGRESS_FILE)) {
        fs.writeFileSync(PROGRESS_FILE, '{}');
    }
}

// Storage functions
function getProgress(userId) {
    ensureDataDirectory();
    const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    return data[userId] || null;
}

function saveProgress(userId, progress) {
    ensureDataDirectory();
    const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    data[userId] = progress;
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
}

function deleteProgress(userId) {
    ensureDataDirectory();
    const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    delete data[userId];
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
}

// Application flow functions
async function askNextQuestion(channel, userId, role, step, answers, originalAnswers) {
    const followUpQuestions = applicationTypes[role].followUpQuestions;
    const nextQuestion = followUpQuestions[step];

    const embed = new EmbedBuilder()
        .setColor('#fc7a23')
        .setTitle(`Followup Question (${step + 1}/${followUpQuestions.length})`)
        .setDescription(nextQuestion.label)
        .setFooter({
            text: 'PixelBound Entertainment - Ticket System',
            iconURL: 'https://cdn.discordapp.com/attachments/1188570570288275600/1353296064928813127/cb3ba39c559e8033534fddcc375a658b.png',
        })
        .setTimestamp();

    await channel.send({ embeds: [embed] });
    saveProgress(userId, { role, step, answers, originalAnswers });
}

async function completeApplication(message, role, answers, originalAnswers) {
    const followUpQuestions = applicationTypes[role].followUpQuestions;

    const combinedEmbed = new EmbedBuilder()
        .setColor('#fc7a23')
        .setTitle(`📄 ${applicationTypes[role].role} Application`)
        .setDescription(`From ${message.author.tag} (ID: ${message.author.id})`)
        .addFields(
            ...applicationTypes[role].questions.map(q => ({
                name: q.label,
                value: truncateText(originalAnswers[q.id] || 'Not provided'),
                inline: false
            })),
            ...followUpQuestions.map(q => ({
                name: q.label,
                value: truncateText(answers[q.id] || 'Not provided'),
                inline: false
            }))
        )
        .setFooter({
            text: 'Application completed - Awaiting review',
            iconURL: 'https://cdn.discordapp.com/attachments/1188570570288275600/1353296064928813127/cb3ba39c559e8033534fddcc375a658b.png'
        })
        .setTimestamp();

    const decisionButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`accept_${message.author.id}_${role}`)
            .setLabel('Accept')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`deny_${message.author.id}_${role}`)
            .setLabel('Deny')
            .setStyle(ButtonStyle.Danger)
    );

    await message.channel.send({ embeds: [combinedEmbed] });

    const logsChannel = message.guild.channels.cache.get(LOGS_CHANNEL_ID);
    if (logsChannel) {
        await logsChannel.send({ 
            embeds: [combinedEmbed],
            components: [decisionButtons]
        });
    }

    deleteProgress(message.author.id);
}

// Recovery system
async function recoverProgress(client) {
    ensureDataDirectory();
    const progressData = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    
    for (const [userId, progress] of Object.entries(progressData)) {
        try {
            const user = await client.users.fetch(userId).catch(() => null);
            if (!user) continue;

            const guild = client.guilds.cache.first(); // Adjust if needed
            const ticketChannel = guild.channels.cache.find(c => 
                c.topic?.includes(`Ticket created by ${userId}`)
            );

            if (ticketChannel) {
                await askNextQuestion(
                    ticketChannel,
                    userId,
                    progress.role,
                    progress.step,
                    progress.answers,
                    progress.originalAnswers
                );
                console.log(`Recovered progress for user ${userId}`);
            }
        } catch (error) {
            console.error(`Failed to recover progress for ${userId}:`, error);
        }
    }
}

// Main handler
module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;
        if (!message.channel.topic?.includes('Ticket created by ')) return;

        const userId = message.channel.topic.replace('Ticket created by ', '');
        if (message.author.id !== userId) return;

        const progress = getProgress(userId);
        if (!progress) return;

        const { role, step, answers, originalAnswers } = progress;
        const followUpQuestions = applicationTypes[role].followUpQuestions;

        // Store response
        answers[followUpQuestions[step].id] = message.content;

        if (step + 1 < followUpQuestions.length) {
            await askNextQuestion(
                message.channel,
                userId,
                role,
                step + 1,
                answers,
                originalAnswers
            );
        } else {
            await completeApplication(message, role, answers, originalAnswers);
        }
    },
    // Export for bot startup
    recoverProgress
};