const { WebhookClient, EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const originalConsole = {
    error: console.error,
    warn: console.warn,
    log: console.log
};

class NuclearErrorHandler {
    constructor(client) {
        this.client = client;
        this.webhook = config.errorWebhook 
            ? new WebhookClient({ url: config.errorWebhook })
            : null;
        this.errorCache = new Set();
        this.lastSent = 0;
        this.overrideConsole();
    }

    overrideConsole() {
        console.error = (...args) => {
            originalConsole.error(...args);
            this.processConsole('error', args);
        };
        console.warn = (...args) => {
            originalConsole.warn(...args);
            this.processConsole('warning', args);
        };
    }

    async nuclearCatch(error, context = {}) {
        try {
            // Rate limiting
            const now = Date.now();
            if (now - this.lastSent < 2000) return;
            this.lastSent = now;

            // Create embed
            const embed = this.createErrorEmbed(error, context);
            await this.dispatchToOverlord(embed);
        } catch (fallbackError) {
            originalConsole.error('💀 Error handler failed:', fallbackError);
        }
    }

    createErrorEmbed(error, context) {
        return new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle(`☢️ ${error.name || 'UnknownError'}`)
            .addFields(
                { name: '📍 Location', value: `\`${context.location || 'unknown'}\``, inline: true },
                { name: '🕒 Timestamp', value: new Date().toISOString(), inline: true },
                { name: '📝 Message', value: `\`\`\`${this.sanitize(error.message || 'No message')}\`\`\`` },
                { name: '🔍 Stack Trace', value: `\`\`\`${this.sanitize(error.stack || 'No stack')}\`\`\`` },
                ...(context.additionalInfo ? [
                    { name: 'ℹ️ Context', value: this.sanitize(context.additionalInfo) }
                ] : [])
            )
            .setFooter({ text: `${this.client.user?.username || 'Bot'} Error Handler` });
    }

    processConsole(type, args) {
        const message = args
            .map(arg => arg instanceof Error ? `${arg.message}\n${arg.stack}` : String(arg))
            .join(' ');

        const error = new Error(`Console ${type}`);
        error.stack = message;

        this.nuclearCatch(error, {
            location: 'console',
            additionalInfo: `Triggered via console.${type}`
        });
    }

    sanitize(text) {
        return String(text)
            .replace(/```/g, '´´´')
            .substring(0, 1000);
    }

    async dispatchToOverlord(embed) {
        try {
            // Try webhook first if configured
            if (this.webhook) {
                await this.webhook.send({
                    embeds: [embed],
                    username: 'PixelBound\s Utilities',
                    avatarURL: this.client.user?.displayAvatarURL()
                }).catch(() => this.fallbackToDM(embed));
                return;
            }
            
            // Fallback to DM if no webhook
            await this.fallbackToDM(embed);
        } catch (error) {
            originalConsole.error('Failed to dispatch error:', error);
        }
    }

    async fallbackToDM(embed) {
        if (!config.ownerId) return;
        
        try {
            const owner = await this.client.users.fetch(config.ownerId);
            await owner.send({ 
                content: '⚠️ **Error Notification** ⚠️',
                embeds: [embed] 
            });
        } catch (dmError) {
            originalConsole.error('Failed to DM owner:', dmError);
        }
    }

    enableDoomsdayProtocols() {
        process.on('unhandledRejection', (error) => {
            this.nuclearCatch(error, { 
                location: 'process/unhandledRejection',
                additionalInfo: 'Unhandled Promise Rejection'
            });
        });

        process.on('uncaughtException', (error) => {
            this.nuclearCatch(error, { 
                location: 'process/uncaughtException',
                additionalInfo: 'Process Crash Imminent'
            });
        });
    }

    wrap(handler) {
        return async (...args) => {
            try {
                return await handler(...args);
            } catch (error) {
                await this.nuclearCatch(error, { 
                    location: handler.name,
                    additionalInfo: `Event: ${args[0]?.constructor?.name || 'Unknown'}`
                });
                throw error;
            }
        };
    }
}

module.exports = NuclearErrorHandler;