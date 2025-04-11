const { Events } = require('discord.js');
const Counting = require("../../Schemas/Counting");
const UserCount = require("../../Schemas/UserCount");
const { countAllUserMessages } = require("../../Utils/countingUtils");
const MILESTONES = require("../../data/CountingThresholds");

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;
        
        try {
            // 1. Check if message is in counting channel
            const countingData = await Counting.findOne({ 
                Guild_ID: message.guild.id 
            });
            if (!countingData || message.channel.id !== countingData.Channel_ID) return;

            // 2. Validate the number
            const currentNumber = parseInt(message.content);
            if (isNaN(currentNumber)) {
                await message.delete();
                return;
            }

            // 3. Check count correctness
            if (currentNumber !== countingData.NextCount) {
                await message.delete();
                return;
            }

            // 4. Prevent same-user counting
            if (message.author.id === countingData.LastUser_ID) {
                await message.delete();
                return;
            }

            // 5. Update server count
            await Counting.findOneAndUpdate(
                { Guild_ID: message.guild.id },
                {
                    CurrentCount: currentNumber,
                    NextCount: currentNumber + 1,
                    LastUser_ID: message.author.id,
                    LastUser_Name: message.author.username,
                    SetAt: new Date()
                },
                { new: true }
            );

            // 6. Handle user counts
            const existingUser = await UserCount.findOne({
                g: message.guild.id,
                u: message.author.id
            });

            const totalCounts = !existingUser 
                ? await handleNewCounter(message, currentNumber)
                : await updateExistingCounter(message, existingUser);

            if (totalCounts > 0) {
                await evaluateMilestones(message.member, totalCounts);
            }

        } catch (error) {
            console.error('Counting error:', error);
            message.channel.send(`❌ Error processing count: ${error.message}`)
                .then(m => setTimeout(() => m.delete(), 5000))
                .catch(() => {});
        }
    }
};

async function handleNewCounter(message, currentNumber) {
    try {
        const totalCounts = await countAllUserMessages(message.channel, message.author.id, 'counting');
        
        await UserCount.create({
            g: message.guild.id,
            u: message.author.id,
            c: totalCounts,
            l: currentNumber,
            f: new Date()
        });

        return totalCounts;
    } catch (error) {
        await message.channel.send(`❌ ${error.message}`)
            .then(m => setTimeout(() => m.delete(), 5000));
        return 0;
    }
}

async function updateExistingCounter(message, existingUser) {
    const currentNumber = parseInt(message.content); // Get current number from message
    const updated = await UserCount.findOneAndUpdate(
        { g: message.guild.id, u: message.author.id },
        { $inc: { c: 1 }, l: currentNumber },
        { new: true }
    );
    return updated.c;
}

async function evaluateMilestones(member, count) {
    try {
        // Get all milestone thresholds (100, 200, etc.)
        const thresholds = Object.keys(MILESTONES).map(Number).sort((a,b) => a-b);
        
        // Check if current count EXACTLY matches a milestone
        const isExactMilestone = thresholds.includes(count);
        
        if (!isExactMilestone) return; // Exit if not exactly a milestone number

        const roleId = MILESTONES[count]; // Get role ID for this exact milestone
        const role = await member.guild.roles.fetch(roleId);

        if (!role) {
            console.warn(`Role ID ${roleId} not found for threshold ${count}`);
            return;
        }

        // Check if user already has this exact role
        if (member.roles.cache.has(roleId)) return;

        // Remove all lower milestone roles
        const rolesToRemove = thresholds
            .filter(t => t < count) // Only lower milestones
            .map(t => MILESTONES[t])
            .map(id => member.roles.cache.get(id))
            .filter(Boolean);

        if (rolesToRemove.length > 0) {
            await member.roles.remove(rolesToRemove);
        }

        // Add the new milestone role
        await member.roles.add(role);
        
        try {
            await member.send(`🎉 **Milestone Achieved!** You've earned the ${role.name} role at ${count} counts!`);
        } catch (dmError) {

        }

    } catch (error) {
        console.error('Role evaluation error:', error);
    }
}