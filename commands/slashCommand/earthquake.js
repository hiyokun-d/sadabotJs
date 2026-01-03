const axios = require("axios");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName("earth-quake")
    .setDescription("Get an earthquake data in Indonesia - powered by BMKG"),

  async execute(bot, interaction) {
    try {
      await interaction.deferReply({ ephemeral: false });

      let headersList = {
        Accept: "*/*",
        "User-Agent": "Thunder Client (https://www.thunderclient.com)",
      };

      let reqOptions = {
        url: "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json",
        method: "GET",
        headers: headersList,
      };

      let response = await axios.request(reqOptions);
      console.log(response.data.Infogempa);

      // Check the content-type header to determine if the response is JSON or needs special handling
      if (!response.headers["content-type"].includes("application/json")) {
        throw new Error("API did not return JSON data");
      }

      // Check if the response is a stringified JSON
      let data = response.data.Infogempa.gempa;
      if (typeof data === "string") {
        // Attempt to parse the string as JSON
        try {
          data = JSON.parse(data);
        } catch (err) {
          throw new Error("Failed to parse the stringified JSON data");
        }
      }
      if (!data) {
        return interaction.editReply(
          "BMKG tidak menyediakan data saat ini >:(",
        );
      }

      const quakeEmbed = new EmbedBuilder()
        .setColor(0xff5733) // You can choose any color
        .setTitle("Gempa Terbaru di Indonesia")
        .setDescription(`Informasi gempa dari BMKG`)
        .addFields(
          { name: "Wilayah", value: data.Wilayah || "N/A", inline: true },
          { name: "Potensi", value: data.Potensi || "N/A", inline: true },
        )
        .setImage(`https://data.bmkg.go.id/DataMKG/TEWS/${data.Shakemap}` || "")
        .setFooter({
          text: "Data disediakan oleh BMKG",
          iconURL: "https://www.bmkg.go.id/asset/img/favicon.ico",
        })
        .setTimestamp()
        .addFields(
          { name: "Tanggal", value: data.Tanggal || "N/A", inline: true },
          { name: "Jam", value: data.Jam || "N/A", inline: true },
          { name: "Koordinat", value: data.Coordinates || "N/A", inline: true },
        )
        .addFields(
          { name: "Lintang", value: data.Lintang || "N/A", inline: true },
          { name: "Bujur", value: data.Bujur || "N/A", inline: true },
          { name: "Magnitudo", value: data.Magnitude || "N/A", inline: true },
        )
        .addFields(
          { name: "Kedalaman", value: data.Kedalaman || "N/A", inline: true },
          { name: "Dirasakan", value: data.Dirasakan || "N/A", inline: true },
        );
      // Send the embed in the reply
      await interaction.editReply({ embeds: [quakeEmbed] });
    } catch (e) {
      try {
        const owner =
          await interaction.client.users.fetch("722295696903897119");
        await owner.send({
          content: `MASTER! ERROR DETECTED!`,
          files: [
            {
              attachment: "./assets/sadaCried.jpg", // your local path
              name: "sadaCried.jpg", // filename sent to Discord
            },
          ],
          embeds: [
            {
              color: 0xff0000,
              title: "⚠️ Error Occurred",
              description: `\`\`\`${e.message || e}\`\`\``,
              image: { url: "attachment://sadaCried.jpg" },
              fields: [
                {
                  name: "Command",
                  value: interaction.commandName || "Unknown",
                },
                {
                  name: "Location",
                  value: interaction.guild?.name
                    ? `${interaction.guild.name} / #${interaction.channel?.name}`
                    : "DM / Unknown",
                },
                {
                  name: "User triggered",
                  value: `${interaction.user.tag} (${interaction.user.id})`,
                },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
      } catch (dmError) {
        console.error("❌ Failed to DM owner error report:", dmError);
      }

      // Notify user nicely
      await interaction.followUp({
        content: `❌ Sorryyyyyy!!!!, but i can't assist you with that command.\ni already told My master plssss be patient.`,
        ephemeral: true,
      });
    }
  },
};
