const axios = require("axios")
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName("earth-quake")
    .setDescription("Get an Earth quake data in indonesia - powered by BMKG"),

  async execute(bot, interaction) {
    try {
      let reqOptions = {
        url: "https://cuaca-gempa-rest-api.vercel.app/quake",
        method: "GET",
      }

      let response = await axios.request(reqOptions);

      // if (!response.data.status) interaction.reply("BMKG gak mau ngasih datanya >:(")
      const data = response.data.data

      /* 
        tanggal: "25 Sep 2024",
  jam: "16:16:35 WIB",
  datetime: "2024-09-25T09:16:35+00:00",
  coordinates: "-2.91,119.43",
  lintang: "2.91 LS",
  bujur: "119.43 BT",
  magnitude: "3.2",
  kedalaman: "10 km",
  wilayah: "Pusat gempa berada di darat 11 km timurlaut Mamasa",
  potensi: "Gempa ini dirasakan untuk diteruskan pada masyarakat",
  dirasakan: "II Mamasa",
  shakemap: "https://data.bmkg.go.id/DataMKG/TEWS/20240925161635.mmi.jpg",
      
      */

      const quakeEmbed = new EmbedBuilder()
        .setColor(0xFF5733) // You can choose any color
        .setTitle('Gempa Terbaru di Indonesia')
        .setDescription(`Informasi gempa dari BMKG`)
        .addFields(
          { name: 'Wilayah', value: data.wilayah, inline: true },
          { name: 'Potensi', value: data.potensi, inline: true },
        )
        .setImage(data.shakemap)
        .setFooter({ text: 'Data disediakan oleh BMKG', iconURL: 'https://www.bmkg.go.id/asset/img/favicon.ico' })
        .setTimestamp();
      // .addFields(
      //   {name: "tanggal", value: response.tanggal},
      //   {name: "jam", value: response.jam},
      //   {name: "coordinates", value: response.coordinates},
      // )
      // .addFields(
      //   {name: "lintang", value: response.lintang, inline: true },
      //   {name: "bujur", value: response.bujur, inline: true },
      //   {name: "magnitude", value: response.magnitude, inline: true}
      // )

      // Send the embed in the reply
      await interaction.reply({ embeds: [quakeEmbed] });

    } catch (error) {
      console.error(`[ERROR] ${error}`)
      await interaction.reply(`There was an error while reloading a command:\n\`${error.message}\``);
    }
  }
}
