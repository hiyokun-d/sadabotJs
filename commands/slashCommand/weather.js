const { SlashCommandBuilder } = require("discord.js");
const path = require("path");
const fs = require("fs");
const { default: axios } = require("axios");
const KODE_WILAYAH_RAW = path.join("./data", "kode_wilayah.json");
const wilayahDataJson = fs.existsSync(KODE_WILAYAH_RAW)
  ? JSON.parse(fs.readFileSync(KODE_WILAYAH_RAW, "utf-8"))
  : [];

const wilayahMap = new Map();
for (const w of wilayahDataJson) {
  const key = `${w.kecamatan}-${w.kab_kota}`;
  if (!wilayahMap.has(key)) {
    wilayahMap.set(key, {
      kecamatan: w.kecamatan,
      kab_kota: w.kab_kota,
      kode: w.kode,
      kelurahan: w.kelurahan,
      provinsi: w.provinsi,
    });
  }
}
const wilayahData = [...wilayahMap.values()];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("weather")
    .setDescription(
      "get current precise location weather forecast - powered by BMKG",
    )
    .addStringOption((input) =>
      input
        .setName("kelurahan")
        .setDescription(
          "Masukkan nama kelurahan yang kamu mau liat prediksi cuacanya - powered by bmkg",
        )
        .setAutocomplete(true)
        .setRequired(true),
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();

    const results = wilayahData
      .filter((v) => v.kelurahan?.toLowerCase().includes(focused))
      .slice(0, 25);

    await interaction.respond(
      results.map((r) => ({
        name: `${r.kelurahan} - ${r.kab_kota}`,
        value: r.kode,
      })),
    );
  },

  async execute(bot, interaction) {
    const responds =
      interaction.options.getString("kelurahan") || "31.73.07.1005"; // expected to return "kode" || default: palmerah

    const wilayah = wilayahDataJson.find((w) => w.kode == responds);

    await interaction.reply({
      embeds: [
        {
          color: 0xffffff,
          title: "LOAD THE DATA",
          description: "calling data from the cave...",
        },
      ],
    });

    if (!wilayah) {
      return interaction.editReply({
        embeds: [
          {
            color: 0xff0000,
            title: "⚠️DATA NOT FOUND!⚠️",
            description: "sorry but i'm not founding anything",
          },
        ],
      });
    }

    try {
      const response = await axios.get(
        `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${responds}`,
      );

      // console.log(response.data.data[0].cuaca);
      const forecasts = response.data.data[0].cuaca; // flatten nested arrays

      // Sort forecasts by datetime
      forecasts.sort(
        (a, b) => new Date(a.local_datetime) - new Date(b.local_datetime),
      );

      const upcoming = forecasts.slice(0, 4);

      if (upcoming.length === 0) {
        return interaction.editReply(
          `⚠️ No upcoming forecast data for ${wilayah.kecamatan}.`,
        );
      }

      const current = upcoming[0][0];
      const next3 = upcoming[0].slice(1, 5);

      interaction.editReply({
        embeds: [
          {
            color: 0x0099ff,
            title: `🌤 Weather for ${wilayah.kelurahan}, ${wilayah.kab_kota}`,
            description: `**${current.weather_desc_en} (${current.weather_desc})**`,
            fields: [
              {
                name: "🌡️ Temperature",
                value: `${current.t}°C`,
                inline: true,
              },
              {
                name: "💧 Humidity",
                value: `${current.hu}%`,
                inline: true,
              },
              {
                name: "🌬️ Wind",
                value: `${current.ws} m/s (${current.wd})`,
                inline: true,
              },
              {
                name: "🕒 Forecast Time",
                value: new Date(current.local_datetime).toLocaleString("id-ID"),
                inline: false,
              },
              {
                name: "📈 Visibility",
                value: current.vs_text || "> 10 km",
                inline: true,
              },
              {
                name: "📅 Data Updated",
                value: new Date(current.analysis_date).toLocaleString("id-ID"),
                inline: true,
              },
              {
                name: `🔮 Next ${next3.length} Forecasts`,
                value: next3
                  .map(
                    (f) =>
                      `🕒 **${new Date(f.local_datetime).toLocaleTimeString(
                        "id-ID",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}** — ${f.weather_desc} (${f.t}°C, 💧${f.hu}%)`,
                  )
                  .join("\n"),
                inline: false,
              },
            ],
          },
        ],
      });
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
              footer: {
                text: "Data source: BMKG",
                iconURL: "https://www.bmkg.go.id/asset/img/favicon.ico",
              },
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
