const { TextInputStyle } = require('discord.js');

module.exports = {
    modeller: {
        role: 'PixelBound Modeller',
        questions: [
            { id: 'q1', label: 'Roblox username?', style: TextInputStyle.Short, required: true },
            { id: 'q2', label: 'Modelling exp (years)?', style: TextInputStyle.Short, required: true },
            { id: 'q3', label: 'Primary modeling tools?', style: TextInputStyle.Short, required: true },
            { id: 'q4', label: 'Best model example?', style: TextInputStyle.Short, required: true }
        ],
        followUpQuestions: [
            { id: 'f1', label: 'Can you share a Roblox library link or screenshots of your best models? Describe your workflow for creating optimized assets that fit PixelBound\'s art style.' },
            { id: 'f2', label: 'How would you approach creating a stylized weapon model for PixelBound? What references would you use to match our game\'s aesthetic?' },
            { id: 'f3', label: 'What techniques do you use to optimize models for Roblox\'s limitations while maintaining quality for PixelBound games?' },
            { id: 'f4', label: 'How do you incorporate feedback when your models need revisions for PixelBound\'s specific requirements?' },
            { id: 'f5', label: 'Describe your experience with rigging models for Roblox animation systems used in PixelBound games.' }
        ]
    },
    builder: {
        role: 'PixelBound Builder',
        questions: [
            { id: 'q1', label: 'Roblox username?', style: TextInputStyle.Short, required: true },
            { id: 'q2', label: 'Building specialty?', style: TextInputStyle.Short, required: true },
            { id: 'q3', label: 'Favorite building tool?', style: TextInputStyle.Short, required: true },
            { id: 'q4', label: 'Best build example?', style: TextInputStyle.Short, required: true }
        ],
        followUpQuestions: [
            { id: 'f1', label: 'Share screenshots of your best Roblox builds. How do you balance detail with performance optimization in large-scale PixelBound environments?' },
            { id: 'f2', label: 'Describe how you would recreate a specific PixelBound game location (e.g., spawn area) while adding your unique building style.' },
            { id: 'f3', label: 'What techniques do you use for creating immersive terrain that fits PixelBound\'s game worlds?' },
            { id: 'f4', label: 'How would you collaborate with scripters to create interactive elements in PixelBound builds?' },
            { id: 'f5', label: 'Describe your approach to lighting PixelBound environments to create the right mood.' }
        ]
    },
    scripter: {
        role: 'PixelBound Scripter',
        questions: [
            { id: 'q1', label: 'Roblox username?', style: TextInputStyle.Short, required: true },
            { id: 'q2', label: 'Lua experience (years)?', style: TextInputStyle.Short, required: true },
            { id: 'q3', label: 'Favorite framework?', style: TextInputStyle.Short, required: true },
            { id: 'q4', label: 'Complex script made?', style: TextInputStyle.Short, required: true }
        ],
        followUpQuestions: [
            { id: 'f1', label: 'Explain how you would optimize a laggy combat system in a PixelBound game.' },
            { id: 'f2', label: 'Describe your approach to creating a secure anti-exploit system for a PixelBound game with player trading.' },
            { id: 'f3', label: 'How would you implement a reliable DataStore solution for PixelBound player progression?' },
            { id: 'f4', label: 'What practices do you use to write modular, maintainable code for PixelBound\'s development team?' },
            { id: 'f5', label: 'Walk us through your debugging process when fixing issues in PixelBound games.' }
        ]
    },
    animator: {
        role: 'PixelBound Animator',
        questions: [
            { id: 'q1', label: 'Roblox username?', style: TextInputStyle.Short, required: true },
            { id: 'q2', label: 'Animation style?', style: TextInputStyle.Short, required: true },
            { id: 'q3', label: 'Primary tool?', style: TextInputStyle.Short, required: true },
            { id: 'q4', label: 'Best animation?', style: TextInputStyle.Short, required: true }
        ],
        followUpQuestions: [
            { id: 'f1', label: 'Share a demo reel. How would you create fluid combat animations for PixelBound while maintaining Roblox performance limits?' },
            { id: 'f2', label: 'Explain your process for syncing facial animations with PixelBound\'s dialogue systems.' },
            { id: 'f3', label: 'How would you approach creating expressive emotes for PixelBound characters?' },
            { id: 'f4', label: 'How do you prioritize animations when working on PixelBound\'s diverse character actions?' },
            { id: 'f5', label: 'Describe your knowledge of rigging models specifically for PixelBound\'s animation needs.' }
        ]
    },
    projectmanager: {
        role: 'Project Manager',
        questions: [
            { id: 'q1', label: 'Roblox username?', style: TextInputStyle.Short, required: true },
            { id: 'q2', label: 'Teams managed?', style: TextInputStyle.Short, required: true },
            { id: 'q3', label: 'Preferred tools?', style: TextInputStyle.Short, required: true },
            { id: 'q4', label: 'Biggest project?', style: TextInputStyle.Short, required: true }
        ],
        followUpQuestions: [
            { id: 'f1', label: 'How would you coordinate a 10-person team to deliver a PixelBound update in 2 weeks?' },
            { id: 'f2', label: 'How do you handle creative disagreements in PixelBound\'s development team?' },
            { id: 'f3', label: 'What systems would you implement to track PixelBound project milestones?' },
            { id: 'f4', label: 'How would you help PixelBound team members meet tight deadlines?' },
            { id: 'f5', label: 'Describe your ideal QA process for PixelBound game updates.' }
        ]
    },
    trialmoderator: {
        role: 'Trial Moderator',
        questions: [
            { id: 'q1', label: 'Roblox username?', style: TextInputStyle.Short, required: true },
            { id: 'q2', label: 'Mod exp (months)?', style: TextInputStyle.Short, required: true },
            { id: 'q3', label: 'Timezone?', style: TextInputStyle.Short, required: true },
            { id: 'q4', label: 'Active hours?', style: TextInputStyle.Short, required: true }
        ],
        followUpQuestions: [
            { id: 'f1', label: 'A popular player is exploiting in PixelBound but brings many friends. How would you handle this?' },
            { id: 'f2', label: 'Describe your process for investigating inappropriate behavior in PixelBound.' },
            { id: 'f3', label: 'How would you de-escalate a heated argument in PixelBound\'s main game chat?' },
            { id: 'f4', label: 'How would you handle a situation where a PixelBound player is falsely reporting others?' },
            { id: 'f5', label: 'What would be your approach to moderating a large PixelBound in-game event?' }
        ]
    },
    socialmediamanager: {
        role: 'Social Media Manager',
        questions: [
            { id: 'q1', label: 'Roblox username?', style: TextInputStyle.Short, required: true },
            { id: 'q2', label: 'Platforms used?', style: TextInputStyle.Short, required: true },
            { id: 'q3', label: 'Content examples?', style: TextInputStyle.Short, required: true },
            { id: 'q4', label: 'Growth strategy?', style: TextInputStyle.Short, required: true }
        ],
        followUpQuestions: [
            { id: 'f1', label: 'What PixelBound TikTok content would you create to boost engagement?' },
            { id: 'f2', label: 'How would you respond to viral criticism of PixelBound\'s updates?' },
            { id: 'f3', label: 'What strategies would you use to build PixelBound\'s online community?' },
            { id: 'f4', label: 'Describe your ideal weekly content schedule for PixelBound\'s social media.' },
            { id: 'f5', label: 'What types of collaborations would you pursue to grow PixelBound\'s audience?' }
        ]
    }
};