const { Interaction, EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (!interaction.isCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) return
        /*if (interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            try{
                await command.execute(interaction, client);
            } catch (error) {
                console.log(error);
                await interaction.reply({
                    content: 'There was an error while executing this command!', 
                    ephemeral: true
                });
            } 
        }else { 
            interaction.reply({ embeds: [embed], ephemeral: true})
        }*/
                try{
                    await command.execute(interaction, client);
                } catch (error) {
                    console.log(error);
                    await interaction.reply({
                        content: 'There was an error while executing this command!', 
                    });
                } 
    

    },
};