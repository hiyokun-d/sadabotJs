const axios = require("axios");
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName("earth-quake")
    .setDescription("Get an earthquake data in Indonesia - powered by BMKG"),

  async execute(bot, interaction) {
    try {
      await interaction.deferReply({ ephemeral: false });

      let headersList = {
        "Accept": "*/*",
        "User-Agent": "Thunder Client (https://www.thunderclient.com)"
      }

      let reqOptions = {
        url: "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json",
        method: "GET",
        headers: headersList,
      }

      let response = await axios.request(reqOptions)

      let cleanedData = response.data.replace(/[\u0000-\u001F\u007F]/g, '');  // Removes control characters
      let data = JSON.parse(cleanedData).Infogempa.gempa;  // Now parse the cleaned string

      if (!data) {
        return interaction.editReply("BMKG tidak menyediakan data saat ini >:(");
      }

      const quakeEmbed = new EmbedBuilder()
        .setColor(0xFF5733) // You can choose any color
        .setTitle('Gempa Terbaru di Indonesia')
        .setDescription(`Informasi gempa dari BMKG`)
        .addFields(
          { name: 'Wilayah', value: data.Wilayah || 'N/A', inline: true },
          { name: 'Potensi', value: data.Potensi || 'N/A', inline: true }
        )
        .setImage(`https://data.bmkg.go.id/DataMKG/TEWS/${data.Shakemap}` || '')
        .setFooter({ text: 'Data disediakan oleh BMKG', iconURL: 'https://www.bmkg.go.id/asset/img/favicon.ico' })
        .setTimestamp()
        .addFields(
          { name: "Tanggal", value: data.Tanggal || 'N/A', inline: true },
          { name: "Jam", value: data.Jam || 'N/A', inline: true },
          { name: "Koordinat", value: data.Coordinates || 'N/A', inline: true },
        )
        .addFields(
          { name: "Lintang", value: data.Lintang || 'N/A', inline: true },
          { name: "Bujur", value: data.Bujur || 'N/A', inline: true },
          { name: "Magnitudo", value: data.Magnitude || 'N/A', inline: true },
        )
        .addFields(
          { name: "Kedalaman", value: data.Kedalaman || 'N/A', inline: true },
          { name: "Dirasakan", value: data.Dirasakan || 'N/A', inline: true }
        );
      // Send the embed in the reply
      await interaction.editReply({ embeds: [quakeEmbed] });

    } catch (error) {
      console.error(`[ERROR] ${error}`);
      console.error(error)
      await interaction.editReply(`Terjadi kesalahan saat memuat perintah:\n\`${error.message}\``);
    }
  }
};
