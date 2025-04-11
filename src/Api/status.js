const { EmbedBuilder } = require('discord.js');
const express = require('express');
const mongoose = require('mongoose');

module.exports = (client, config) => {
    const router = express.Router();
    const statusCache = new Map();
    const invalidRequestCooldown = new Set();
    const SECURITY_COOLDOWN = config.security?.logCooldown || 10000;
    let lastStatusMessageId = null;

    const CRITICAL_UPDATE_INTERVAL = 60000; // 1 minute
    const REMINDER_INTERVAL = 300000; // 5 minutes
    let criticalReminder;

    function getRawRequestData(req) {
        return {
            method: req.method,
            url: req.originalUrl,
            headers: req.headers,
            body: req.body,
            query: req.query,
            params: req.params,
            ip: req.ip,
            timestamp: new Date().toISOString()
        };
    }

    router.use((req, res, next) => {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
            logInvalidRequest({
                type: "MISSING_API_KEY",
                path: req.path,
                client: config.clientId,
                fullRequest: getRawRequestData(req)
            });
            return res.status(401).json({ error: 'API key required' });
        }
        if (apiKey !== config.apiKey) {
            logInvalidRequest({
                type: "INVALID_API_KEY",
                path: req.path,
                APIKey: apiKey,
                client: config.clientId,
                fullRequest: getRawRequestData(req)
            });
            return res.status(403).json({ error: 'Invalid API key' });
        }
        next();
    });

    router.post('/status-update', async (req, res) => {
        const startTime = Date.now();
        const requestId = Math.random().toString(36).substring(2, 10);

        try {
            const statusData = req.body;
            if (!statusData || typeof statusData !== 'object') {
                logInvalidRequest({
                    type: "INVALID_BODY",
                    body: JSON.stringify(req.body),
                    client: config.clientId,
                    requestId,
                    fullRequest: getRawRequestData(req)
                });
                return res.status(400).json({ error: 'Invalid request body' });
            }

            const currentStatus = extractStatus(statusData);
            if (!currentStatus || currentStatus.datastores.length === 0) {
                logInvalidRequest({
                    type: "MISSING_STATUS_DATA",
                    body: JSON.stringify(statusData),
                    client: config.clientId,
                    requestId,
                    fullRequest: getRawRequestData(req)
                });
                return res.status(400).json({ error: 'No valid datastore status received' });
            }

            const changes = detectStatusChanges(currentStatus);

            if (changes.hasProblems || changes.hasRecoveries || changes.firstTimeCheck) {
                const message = await sendStatusUpdate(changes, currentStatus, client, config);
                if (message) lastStatusMessageId = message.id;
            }

            updateStatusCache(currentStatus);
            manageCriticalReminders(client, config, currentStatus);

            return res.json({
                success: true,
                changes: changes.changedStores,
                problems: changes.problemStores,
                recoveries: changes.recoveredStores,
                processingTime: Date.now() - startTime
            });

        } catch (error) {
            console.error(`[${requestId}] Request failed:`, error);

            await sendErrorNotification(client, config, {
                error: error.message,
                requestId,
                stack: error.stack
            });

            logInvalidRequest({
                type: "SERVER_ERROR",
                error: error.message,
                stack: error.stack,
                client: config.clientId,
                requestId,
                fullRequest: getRawRequestData(req)
            });
            return res.status(500).json({
                error: 'Internal server error',
                requestId
            });
        }
    });

    function manageCriticalReminders(client, config, currentStatus) {
        const criticalStore = currentStatus.datastores.find(ds => ds.name === 'Main' && ds.status !== 'Online');

        if (criticalStore) {
            if (!criticalReminder) {
                criticalReminder = setInterval(() => {
                    sendCriticalReminder(client, config, criticalStore);
                }, REMINDER_INTERVAL);
            }
        } else if (criticalReminder) {
            clearInterval(criticalReminder);
            criticalReminder = null;
        }
    }

    function sendCriticalReminder(client, config, store) {
        const channel = client.channels.cache.get(config.statusChannelId);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setTitle('🚨 Critical Issue Detected')
            .setDescription(`CRITICAL: ${store.name} (${getOfflineDuration(store)}m) offline`)
            .setColor(0xFF0000)
            .setTimestamp();

        channel.send({ embeds: [embed] });
    }

    function getOfflineDuration(store) {
        const offlineTime = statusCache.get(store.name)?.timestamp || Date.now();
        return Math.floor((Date.now() - offlineTime) / CRITICAL_UPDATE_INTERVAL);
    }

    async function sendErrorNotification(client, config, errorDetails) {
        try {
            const channel = client.channels.cache.get(config.statusChannelId);
            if (!channel) {
                console.error('Status channel not available for error notification');
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('🚨 Critical System Error')
                .setColor(0xFF0000)
                .setDescription('A server error occurred while processing status update')
                .addFields(
                    { name: 'Error', value: `\`\`\`${errorDetails.error}\`\`\``, inline: false },
                    { name: 'Request ID', value: errorDetails.requestId, inline: true }
                )
                .setTimestamp();

            await channel.send({
                content: config.statusConfig.notificationUsers.map(u => `<@${u}>`).join(' '),
                embeds: [embed],
                allowedMentions: { users: config.statusConfig.notificationUsers }
            });

        } catch (notificationError) {
            console.error('Failed to send error notification:', notificationError);
        }
    }

    async function sendStatusUpdate(changes, currentStatus, client, config) {
        const channel = client.channels.cache.get(config.statusChannelId);
        if (!channel) throw new Error('Status channel not available');

        const trackerThread = await getOrCreateTrackerThread(channel, client);
        const ongoingOutages = await loadOutages(trackerThread);
        const now = Date.now();

        const criticalStores = config.statusConfig.alertThresholds.immediateAlert;
        const newCriticalOutages = changes.problemStores.filter(store =>
            criticalStores.some(c => c.toLowerCase() === store.toLowerCase()) &&
            !ongoingOutages.has(store)
        );

        let lastPingId = null;
        if (newCriticalOutages.length > 0) {
            const pingMessage = await channel.send({
                content: `🚨 CRITICAL: ${newCriticalOutages.join(', ')} offline\n` +
                         `${config.statusConfig.notificationUsers.map(u => `<@${u}>`).join(' ')}`,
                allowedMentions: { users: config.statusConfig.notificationUsers }
            });
            lastPingId = pingMessage.id;
            ongoingOutages.set('LAST_PING', lastPingId);
        }

        updateOutageStates(ongoingOutages, changes, criticalStores, now);

        const allRecovered = criticalStores.every(store =>
            !ongoingOutages.has(store) &&
            !changes.problemStores.some(s => s.toLowerCase() === store.toLowerCase())
        );

        if (allRecovered && ongoingOutages.has('LAST_PING')) {
            try {
                const pingToDelete = await channel.messages.fetch(ongoingOutages.get('LAST_PING'));
                await pingToDelete.delete();
                ongoingOutages.clear();
            } catch (error) {
                console.error('Failed to delete ping:', error);
            }
        }

        const embed = buildStatusEmbed(changes, currentStatus, ongoingOutages, now);
        const message = await manageStatusMessage(channel, client, embed);

        await saveOutages(trackerThread, ongoingOutages);
        return message;
    }


    async function sendErrorNotification(client, config, errorDetails) {
        try {
            const channel = client.channels.cache.get(config.statusChannelId);
            if (!channel) {
                console.error('Status channel not available for error notification');
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('🚨 Critical System Error')
                .setColor(0xFF0000)
                .setDescription('A server error occurred while processing status update')
                .addFields(
                    { name: 'Error', value: `\`\`\`${errorDetails.error}\`\`\``, inline: false },
                    { name: 'Request ID', value: errorDetails.requestId, inline: true }
                )
                .setTimestamp();

            // Send notification with user mentions
            await channel.send({
                content: config.statusConfig.notificationUsers.map(u => `<@${u}>`).join(' '),
                embeds: [embed],
                allowedMentions: { users: config.statusConfig.notificationUsers }
            });

        } catch (notificationError) {
            console.error('Failed to send error notification:', notificationError);
        }
    }

    async function sendStatusUpdate(changes, currentStatus, client, config) {
        const channel = client.channels.cache.get(config.statusChannelId);
        if (!channel) throw new Error('Status channel not available');
    
        const trackerThread = await getOrCreateTrackerThread(channel, client);
        const ongoingOutages = await loadOutages(trackerThread);
        const now = Date.now();
    
        const criticalStores = config.statusConfig.alertThresholds.immediateAlert;
        const newCriticalOutages = changes.problemStores.filter(store =>
            criticalStores.some(c => c.toLowerCase() === store.toLowerCase()) &&
            !ongoingOutages.has(store)
        );
    
        // Clean up previous messages before sending new ones
        try {
            // Delete all tracked messages including LAST_PING and individual stores
            for (const [key, messageId] of ongoingOutages) {
                try {
                    const messageToDelete = await channel.messages.fetch(messageId);
                    await messageToDelete.delete();
                    ongoingOutages.delete(key);
                } catch (error) {
                    console.error(`Failed to delete message ${key}:`, error);
                    ongoingOutages.delete(key); // Remove from tracking even if deletion fails
                }
            }
        } catch (error) {
            console.error('Error during message cleanup:', error);
        }
    
        // Send new alerts if needed
        if (newCriticalOutages.length > 0) {
            const pingMessage = await channel.send({
                content: `🚨 CRITICAL: ${newCriticalOutages.join(', ')} offline\n` +
                         `${config.statusConfig.notificationUsers.map(u => `<@${u}>`).join(' ')}`,
                allowedMentions: { users: config.statusConfig.notificationUsers }
            });
            ongoingOutages.set('LAST_PING', pingMessage.id);
            
            // Store individual messages for each critical outage
            for (const store of newCriticalOutages) {
                const storeMessage = await channel.send({
                    content: `🔴 ${store} is currently offline. Investigating...`
                });
                ongoingOutages.set(store, storeMessage.id);
            }
        }
    
        // Update status for all stores (not just critical ones)
        for (const store of Object.keys(currentStatus)) {
            if (changes.problemStores.includes(store)) {
                if (!ongoingOutages.has(store)) {
                    const message = await channel.send({
                        content: `⚠️ ${store} experiencing issues. Monitoring...`
                    });
                    ongoingOutages.set(store, message.id);
                }
            } else if (ongoingOutages.has(store)) {
                try {
                    const recoveryMessage = await channel.send({
                        content: `✅ ${store} is now back online`
                    });
                    // Delete the old outage message
                    const oldMessage = await channel.messages.fetch(ongoingOutages.get(store));
                    await oldMessage.delete();
                    ongoingOutages.delete(store);
                    
                    // Add recovery message to be cleaned up later
                    ongoingOutages.set(`RECOVERY_${store}_${Date.now()}`, recoveryMessage.id);
                } catch (error) {
                    console.error(`Failed to process recovery for ${store}:`, error);
                }
            }
        }
    
        // Build and send status embed
        const embed = buildStatusEmbed(changes, currentStatus, ongoingOutages, now);
        const statusMessage = await manageStatusMessage(channel, client, embed);
    
        // Schedule cleanup of recovery messages after some time
        setTimeout(async () => {
            try {
                const keysToDelete = [];
                for (const [key, messageId] of ongoingOutages) {
                    if (key.startsWith('RECOVERY_')) {
                        try {
                            const message = await channel.messages.fetch(messageId);
                            await message.delete();
                            keysToDelete.push(key);
                        } catch (error) {
                            console.error(`Failed to clean up recovery message ${key}:`, error);
                        }
                    }
                }
                keysToDelete.forEach(key => ongoingOutages.delete(key));
                await saveOutages(trackerThread, ongoingOutages);
            } catch (error) {
                console.error('Error during recovery message cleanup:', error);
            }
        //}, 3600000); // Clean up after 1 hour
        }, 5000); // Clean up after 5m (testing)
    
        await saveOutages(trackerThread, ongoingOutages);
        return statusMessage;
    }

    function buildStatusEmbed(changes, currentStatus, outages, now) {
        const embed = new EmbedBuilder()
            .setTitle(
                changes.hasProblems && changes.hasRecoveries ? '⚠️ Mixed Status' :
                changes.hasProblems ? '⚠️ Datastore Issues' :
                changes.hasRecoveries ? '✅ Recoveries' : 
                '✅ All Systems Operational'
            )
            .setTimestamp();

        if (changes.hasProblems) {
            const criticalStores = changes.problemStores.filter(name => 
                config.statusConfig.alertThresholds.immediateAlert.some(
                    criticalName => name.toLowerCase() === criticalName.toLowerCase()
                )
            );
            
            if (criticalStores.length > 0) {
                const durations = criticalStores.map(store => {
                    const startTime = outages.get(store);
                    return startTime ? `${store} (${Math.floor((now - startTime) / 60000)}m)` : store;
                });
                embed.setDescription(`**CRITICAL:** ${durations.join(', ')} offline`)
                     .setColor(0xFF0000);
            } else {
                embed.setDescription(`**Warning:** ${changes.problemStores.join(', ')} degraded`)
                     .setColor(0xFFA500);
            }
        } else if (changes.hasRecoveries) {
            embed.setDescription(`**Recovered:** ${changes.recoveredStores.join(', ')} back online`)
                 .setColor(0x00FF00);
        } else {
            embed.setDescription('All datastores are functioning normally')
                 .setColor(0x00AA00);
        }

        currentStatus.datastores.forEach(ds => {
            embed.addFields({
                name: `${ds.status === 'Online' ? '✅' : '❌'} ${ds.name}`,
                value: `Status: ${ds.status}`,
                inline: true
            });
        });

        if (currentStatus.note) {
            embed.addFields({ name: '📝 Note', value: currentStatus.note });
        }

        return embed;
    }

    async function manageStatusMessage(channel, client, embed) {
        try {
            const messages = await channel.messages.fetch({ limit: 10 });
            const botMessages = messages.filter(m => 
                m.author.id === client.user.id && m.embeds.length > 0
            );

            if (botMessages.size > 0) {
                return await botMessages.first().edit({ embeds: [embed] });
            }
            return await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error managing status message:', error);
            try {
                return await channel.send({
                    content: '⚠️ Status Update',
                    embeds: [embed]
                });
            } catch (fallbackError) {
                console.error('Complete failure:', fallbackError);
                throw fallbackError;
            }
        }
    }

    function detectStatusChanges(currentStatus) {
        const result = {
            hasChanges: false,
            hasProblems: false,
            hasRecoveries: false,
            firstTimeCheck: !statusCache.size,
            changedStores: [],
            problemStores: [],
            recoveredStores: []
        };

        if (result.firstTimeCheck && currentStatus.datastores.every(ds => ds.status === 'Online')) {
            result.hasChanges = true;
        }

        currentStatus.datastores.forEach(ds => {
            const cached = statusCache.get(ds.name);
            
            if (!cached || cached.status !== ds.status) {
                result.hasChanges = true;
                result.changedStores.push(ds.name);
                
                if (ds.status !== 'Online' && (!cached || cached.status === 'Online')) {
                    result.hasProblems = true;
                    result.problemStores.push(ds.name);
                }
                
                if (ds.status === 'Online' && cached && cached.status !== 'Online') {
                    result.hasRecoveries = true;
                    result.recoveredStores.push(ds.name);
                }
            }
        });

        return result;
    }

    function extractStatus(data) {
        const datastores = [];
        const definitions = [
            { key: 'main_datastore_status', name: 'Main' },
            { key: 'secondary_datastore_status', name: 'Secondary' },
            { key: 'backup_datastore_1_status', name: 'Backup 1H' },
            { key: 'backup_datastore_2_status', name: 'Backup 3H' },
            { key: 'backup_datastore_3_status', name: 'Backup 6H' },
            { key: 'backup_datastore_4_status', name: 'Backup 9H' }
        ];
    
        const statusData = data.status_data || data; 
    
        definitions.forEach(({key, name}) => {
            if (statusData[key] !== undefined) { 
                const updatedKey = key.replace('_status', '_updated');
                datastores.push({
                    name,
                    status: statusData[key],
                    updated: statusData[updatedKey] || 'Unknown'
                });
            }
        });
    
        return {
            timestamp: new Date(),
            datastores,
            note: data.note
        };
    }

    function updateStatusCache(currentStatus) {
        currentStatus.datastores.forEach(ds => {
            statusCache.set(ds.name, {
                status: ds.status,
                updated: currentStatus.timestamp
            });
        });
    }

    async function getOrCreateTrackerThread(channel, client) {
        try {
            const threadName = 'outage-tracker-' + client.user.id;
            const threads = await channel.threads.fetchActive();
            const existing = threads.threads.find(t => t.name === threadName);
            return existing || await channel.threads.create({
                name: threadName,
                autoArchiveDuration: 1440,
                reason: 'Outage tracking',
                type: 'GUILD_PRIVATE_THREAD'
            });
        } catch (error) {
            console.error('Error managing tracker thread:', error);
            throw error;
        }
    }

    async function loadOutages(thread) {
        try {
            const messages = await thread.messages.fetch();
            return messages.size > 0 ? 
                new Map(JSON.parse(messages.first().content)) : 
                new Map();
        } catch (error) {
            console.error('Error loading outages:', error);
            return new Map();
        }
    }

    function updateOutageStates(outages, changes, criticalStores, now) {
        changes.problemStores.forEach(store => {
            const isCritical = criticalStores.some(c => c.toLowerCase() === store.toLowerCase());
            if (isCritical && !outages.has(store)) {
                outages.set(store, now);
            }
        });

        changes.recoveredStores.forEach(store => {
            const foundKey = [...outages.keys()].find(k => k.toLowerCase() === store.toLowerCase());
            if (foundKey) outages.delete(foundKey);
        });
    }

    async function saveOutages(thread, outages) {
        try {
            await thread.send(JSON.stringify([...outages]));
            const messages = await thread.messages.fetch();
            if (messages.size > 1) {
                await messages.last().delete();
            }
        } catch (error) {
            console.error('Error saving outages:', error);
        }
    }

    async function logInvalidRequest(data) {
        try {
            if (invalidRequestCooldown.has(data.ip)) return;
            invalidRequestCooldown.add(data.ip);
            setTimeout(() => invalidRequestCooldown.delete(data.ip), SECURITY_COOLDOWN);

            if (!config.invalidRequestsChannelId) return;
            const channel = client.channels.cache.get(config.invalidRequestsChannelId);
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setTitle(`🚨 ${data.type}`)
                .setColor(0xFF0000)
                .setDescription(`\`\`\`json\n${JSON.stringify(data.fullRequest, null, 2)}\n\`\`\``)
                .addFields(
                    { name: 'Request ID', value: data.requestId || 'N/A', inline: true },
                    { name: 'Client', value: data.client || 'Unknown', inline: true },
                );

            if (data.error) {
                embed.addFields({
                    name: 'Error',
                    value: `\`\`\`\n${data.error}\n\`\`\``,
                    inline: false
                });
            }

            await channel.send({ 
                content: config.security?.notificationRole ? `<@&${config.security.notificationRole}>` : undefined,
                embeds: [embed] 
            });
        } catch (error) {
            console.error('Failed to log invalid request:', error);
        }
    }       
    
    return router;
};
