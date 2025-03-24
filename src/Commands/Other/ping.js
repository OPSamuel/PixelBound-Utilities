const { SlashCommandBuilder} = require("discord.js")

module.exports = {
    data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Tests if the bot is currently responding."),

    async execute (interaction) {
        interaction.reply({content: "Pong", ephemeral: true})
    }
}