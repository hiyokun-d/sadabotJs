const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    cooldown: 3,
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("REPLIES WITH PONG!"),

    async execute(bot, interaction) {
        await interaction.reply({
            content: "My ping is: `" + bot.ws.ping + "`ms",
            ephemeral: true
        })
    }
}