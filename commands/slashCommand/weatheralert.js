const { SlashCommandBuilder, ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder, } = require('discord.js');

const { default: axios } = require("axios");
// import { DOMParser } from "xmldom";
const { DOMParser } = require('xmldom');

async function earlyWarning() {
    // https://www.bmkg.go.id/alerts/nowcast/id
    const { data } = await axios.get("https://www.bmkg.go.id/alerts/nowcast/id");

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data, "text/xml");

    const items = xmlDoc.getElementsByTagName("item");

    const alerts = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const link = item.getElementsByTagName("link")[0]?.textContent || "";

        const { data } = await axios.get(link);
        const moreDetailData = parser.parseFromString(data, "text/xml");

        const imgActualLink =
            moreDetailData.getElementsByTagName("web")[0]?.textContent;
        const title =
            moreDetailData.getElementsByTagName("headline")[0]?.textContent || "";
        const description =
            moreDetailData.getElementsByTagName("description")[0]?.textContent || "";
        const effective =
            moreDetailData.getElementsByTagName("effective")[0]?.textContent || "";
        const expired =
            moreDetailData.getElementsByTagName("expires")[0]?.textContent || "";
        const senderName =
            moreDetailData.getElementsByTagName("senderName")[0]?.textContent || "";

        alerts.push({
            title,
            link,
            imgActualLink,
            description,
            effective,
            expired,
            senderName,
        });
    }

    // console.log(alerts);
    return alerts;
}

module.exports = {
    cooldown: 3,
    data: new SlashCommandBuilder()
        .setName("weatheralert")
        .setDescription("Give the weather alert report from BMKG"),

    async execute(bot, interaction) {
        await interaction.deferReply(); // important for async work

        const items = await earlyWarning(); // your existing function

        if (!items || items.length === 0) {
            return interaction.editReply("⚠️ No weather alerts available right now.");
        }

        let index = 0;

        const generateEmbed = (i) => {
            const item = items[i];

            return new EmbedBuilder()
                .setColor("#ffcc00")
                .setTitle(`⚠️ ${item.title}`)
                .setURL(item.link)
                .setDescription(item.description)
                .setImage(item.imgActualLink)
                .setFooter({
                    text: `valid: ${item.effective} sampai: ${item.expired} | ${i + 1}/${items.length}`,
                });
        };

        const buildRow = () =>
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("prev_alert")
                    .setLabel("⬅️ Sebelumnya")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(index === 0),

                new ButtonBuilder()
                    .setCustomId("next_alert")
                    .setLabel("Berikutnya ➡️")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(index === items.length - 1),
            );

        // Send initial reply
        const sent = await interaction.editReply({
            embeds: [generateEmbed(index)],
            components: [buildRow()],
        });

        const collector = sent.createMessageComponentCollector({
            filter: (i) =>
                i.user.id === interaction.user.id &&
                ["prev_alert", "next_alert"].includes(i.customId),
            time: 120_000, // 2 minutes
        });

        collector.on("collect", async (i) => {
            await i.deferUpdate();

            if (i.customId === "next_alert" && index < items.length - 1) index++;
            if (i.customId === "prev_alert" && index > 0) index--;

            await interaction.editReply({
                embeds: [generateEmbed(index)],
                components: [buildRow()],
            });
        });

        collector.on("end", async () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("prev_alert")
                    .setLabel("⬅️ Sebelumnya")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),

                new ButtonBuilder()
                    .setCustomId("next_alert")
                    .setLabel("Berikutnya ➡️")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
            );

            await interaction.editReply({
                components: [disabledRow],
            }).catch(() => { });
        });
    },
};