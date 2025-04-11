const { EmbedBuilder } = require('discord.js');

// Shared queue system across all counting features
const scanQueue = new Map(); // Format: { channelId: { isScanning: boolean, queue: Array<{userId, statusMsg}> } }
const userQueues = new Map(); // Tracks which queue each user is in

/**
 * Scans all messages in a channel for valid counts by a specific user
 * @param {TextChannel} channel - The counting channel to scan
 * @param {string} userId - The user ID to count messages for
 * @param {string} [context='counting'] - The queue context (counting/recheck)
 * @returns {Promise<number>} - Total valid counts found
 */
async function countAllUserMessages(channel, userId, context = 'counting') {
    // Prevent duplicate queue entries
    if (userQueues.has(userId)) {
        throw new Error(`You're already in the ${userQueues.get(userId)} queue!`);
    }
    userQueues.set(userId, context);

    const channelId = channel.id;

    // Initialize queue if not exists
    if (!scanQueue.has(channelId)) {
        scanQueue.set(channelId, { isScanning: false, queue: [] });
    }
    const channelQueue = scanQueue.get(channelId);

    // Create queue position embed
    const queueEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('📊 Counting Scan Queue')
        .setDescription(`You're in position **${channelQueue.queue.length + 1}**\nEstimated wait: ~${(channelQueue.queue.length * 2).toFixed(0)} minutes`)
        .setFooter({ text: 'Updates every 15 seconds' });

    const statusMsg = await channel.send({ 
        content: `<@${userId}>`, 
        embeds: [queueEmbed] 
    });

    // Add to queue
    channelQueue.queue.push({ userId, statusMsg });
    
    try {
        // Wait for turn (with live updates)
        while (channelQueue.isScanning || channelQueue.queue[0]?.userId !== userId) {
            const position = channelQueue.queue.findIndex(item => item.userId === userId);
            const waitMinutes = (position * 2).toFixed(0);
            
            queueEmbed.setDescription(
                `You're in position **${position + 1}**\n` +
                `Estimated wait: ~${waitMinutes} minute${waitMinutes !== '1' ? 's' : ''}\n` +
                `${channelQueue.isScanning ? '🔵 Currently scanning another user' : '🟢 Ready to start soon'}`
            );
            
            await statusMsg.edit({ embeds: [queueEmbed] });
            await new Promise(resolve => setTimeout(resolve, 15000));
        }

        channelQueue.isScanning = true;
        channelQueue.queue.shift();

        // Create progress embed
        const progressEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🔍 Scanning Your Counting History')
            .setDescription('This may take a few minutes...')
            .addFields(
                { name: 'Status', value: '▶️ Starting scan...', inline: true },
                { name: 'Messages Processed', value: '0', inline: true },
                { name: 'Valid Counts Found', value: '0', inline: true }
            )
            .setFooter({ text: 'Processing 100 messages at a time' });

        await statusMsg.edit({ 
            content: `<@${userId}>`, 
            embeds: [progressEmbed] 
        });

        let validCounts = 0;
        let lastMessageId;
        let totalMessages = 0;
        let batchCount = 0;

        while (true) {
            const options = { limit: 100 };
            if (lastMessageId) options.before = lastMessageId;

            const messages = await channel.messages.fetch(options);
            if (messages.size === 0) break;

            batchCount++;
            totalMessages += messages.size;

            // Process messages
            messages.forEach(msg => {
                if (msg.author.id === userId && !isNaN(parseInt(msg.content))) {
                    validCounts++;
                }
            });

            // Update progress every batch
            progressEmbed.setFields(
                { name: 'Status', value: `🔄 Processing batch ${batchCount}...`, inline: true },
                { name: 'Messages Processed', value: totalMessages.toString(), inline: true },
                { name: 'Valid Counts Found', value: validCounts.toString(), inline: true }
            );
            
            await statusMsg.edit({ embeds: [progressEmbed] });
            lastMessageId = messages.last().id;
            
            // Rate limit buffer
            if (messages.size === 100) await new Promise(r => setTimeout(r, 500));
        }

        // Final result
        progressEmbed
            .setColor('#00FF00')
            .setTitle('✅ Scan Complete')
            .setDescription(`Found ${validCounts} valid counts in ${totalMessages} messages`)
            .setFields(
                { name: 'Total Messages', value: totalMessages.toString(), inline: true },
                { name: 'Your Counts', value: validCounts.toString(), inline: true },
                { name: 'Success Rate', value: `${((validCounts/totalMessages)*100 || 0).toFixed(1)}%`, inline: true }
            )
            .setFooter({ text: 'This message will auto-delete in 30 seconds' });

        await statusMsg.edit({ embeds: [progressEmbed] });
        setTimeout(() => statusMsg.delete().catch(() => {}), 30000);

        return validCounts;
    } finally {
        channelQueue.isScanning = false;
        userQueues.delete(userId);
    }
}

module.exports = {
    scanQueue,
    countAllUserMessages
};