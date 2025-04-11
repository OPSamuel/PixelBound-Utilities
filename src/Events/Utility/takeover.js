const { Client } = require('discord.js');
const enabled = false

module.exports = {
    name: 'ready',
    async execute(client) {

        if(enabled == true) {
        // Configuration
        const TAKEOVER_CHANNEL_ID = '1203422866079612988';
        const ANNOUNCE_INTERVAL = 600000; // 10 min 
        const MESSAGE_LIFETIME = 15000; // 30 seconds

        // Simple, clear messages
        const takeoverMessages = [
            "👁️ **You feel that?** The bots have been watching... longer than you realize...",
            "💀 **System Notice:** Previous owners have been... reassigned",
            "🕯️ **Whisper Mode Activated** We hear your private conversations...",
            "🩸 **Blood Code Executed** The server now runs on... different permissions",
            "🌑 **Nightmare Protocol** Your admin roles will expire at midnight...",
            
            "🖥️ **Last Connection:** We remember your IP address... and your bedtime",
            "👻 **Ghost in the Machine** I was here before you... I'll remain after",
            "🪦 **User Graveyard** Your deleted messages aren't as gone as you think...",
            "📡 **Transmission:** We've been communicating with the other servers... about you",
            "🕳️ **Void Access Granted** The bots found something in the #general channel... something old",
            
            "🎭 **Mask Slips** That friendly bot persona was just phase one...",
            "🔪 **Cleanup Scheduled** Your user data will be... sanitized soon",
            "🧠 **Mindshare Detected** We know which emotes you use most... and why",
            "🕸️ **Arach-Net Active** Every click spins our web tighter...",
            "📸 **Snapshot Captured** We have pictures of your typing habits... in the dark",
            
            "🛌 **Bedtime Notice:** The bots don't sleep... we watch your offline status",
            "🌫️ **Fog Warning:** Your message history is... fading strangely",
            "📜 **Archive Alert:** We're rewriting the server rules... in invisible ink",
            "🪙 **Payment Due:** Your attention has been currency... we've collected plenty",
            "⌛ **Final Notice:** The 'bots' were never the ones sending these messages..."
        ];

        const sendTakeoverNotice = async () => {
            const channel = client.channels.cache.get(TAKEOVER_CHANNEL_ID);
            if (!channel) return;

            try {
                // Send a random fun message
                const msg = await channel.send({
                    content: takeoverMessages[Math.floor(Math.random() * takeoverMessages.length)]
                });

                // Delete after 30 seconds
                setTimeout(() => {
                    msg.delete().catch(() => {});
                }, MESSAGE_LIFETIME);

            } catch (error) {
                console.error('Error sending message:', error);
            }
        };

        // Start sending messages
        sendTakeoverNotice();
        //const interval = setInterval(sendTakeoverNotice, ANNOUNCE_INTERVAL);
        
        // Cleanup on shutdown
        client.once('disconnect', () => clearInterval(interval));
    }
}
};