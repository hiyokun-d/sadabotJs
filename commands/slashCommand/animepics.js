const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require("axios")
module.exports = {
    cooldown: 4,
    data: new SlashCommandBuilder()
        .setName('animepics')
        .setDescription('return anime image'),
    async execute(bot, interaction) {
        let reqOptions = {
            url: "https://api.waifu.pics/sfw/waifu",
            method: "GET",
        }

        let response = await axios.request(reqOptions)

        const embed = new EmbedBuilder()
            .setColor("Random") // Customize embed color
            .setTitle('why you use this command?')
            .setImage(response.data.url) // Add the image URL to the embed

        // Reply with the embed
        await interaction.reply({ embeds: [embed] });
    },
};