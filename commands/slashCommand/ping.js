const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    cooldown: 3,
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("REPLIES WITH PONG!"),

    async execute(interaction) {
        await interaction.reply("pong!")
    }
}