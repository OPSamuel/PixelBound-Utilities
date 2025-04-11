const { SlashCommandBuilder, PermissionFlagsBits} = require("discord.js")

module.exports = {
    data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Tests if the bot is currently responding.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute (interaction) {
        interaction.reply({content: "Pong", ephemeral: true})
    }
}