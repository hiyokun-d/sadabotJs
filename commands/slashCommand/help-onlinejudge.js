const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");

const githubURL = {
  url: "https://api.github.com/repos/hiyokun-d/university-task/contents/",
  method: "GET",
};

// Fetch choices from GitHub
async function fetchChoices() {
  try {
    const req = await axios.request(githubURL);
    const chapters = req.data.filter((a) => a.name.startsWith("chapter"));
    return chapters.map((a) => ({
      name: a.name,
      value: a.name,
    }));
  } catch (error) {
    console.error("Error fetching choices:", error);
    return [];
  }
}

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName("help-onlinejudge")
    .setDescription("Help you to answer your online judge questions")
    .addStringOption((option) =>
      option
        .setName("chapter")
        .setDescription("Choose a chapter, e.g., chapter1")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("questions")
        .setDescription("Choose the question you need help with")
        .setRequired(true),
    ),

  async execute(bot, interaction) {
    try {
      // Defer the reply to give more time for processing
      await interaction.deferReply({ ephemeral: true });

      // Fetch available chapters from GitHub
      const choices = await fetchChoices();
      let selectedChapter = interaction.options.getString("chapter", true);
      const selectedQuestions = interaction.options
        .getString("questions", true)
        .toLowerCase();
      let chapterExists;

      // Handle chapter input (either numeric or prefixed with "chapter")
      if (!isNaN(selectedChapter)) {
        selectedChapter = `chapter${selectedChapter}`;
        chapterExists = choices.some((c) => c.value === selectedChapter);
      } else if (selectedChapter.startsWith("chapter")) {
        chapterExists = choices.some((c) => c.value === selectedChapter);
      }

      if (!chapterExists) {
        return await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor("#f72f2f")
              .setTitle("NO ANSWER! WRONG CHAPTER")
              .setDescription(
                `Choose one of these chapters:\n${choices.map((c) => c.name).join("\n")}`,
              )
              .setThumbnail(
                "https://lms.binus.ac.id/static/media/WARNING_REV.f968abeb.png",
              ),
          ],
        });
      }

      // Fetch questions from the selected chapter
      const URLquestions = {
        url: `https://api.github.com/repos/hiyokun-d/university-task/contents/${selectedChapter}/`,
        method: "GET",
      };
      const questionsReq = await axios.request(URLquestions);
      const questionFilter = questionsReq.data.filter((a) =>
        a.name.endsWith(".c"),
      );
      const questions = questionFilter.map((m) => m.name);

      // Check if the selected question exists in the chapter
      const questionExist = questions.includes(`${selectedQuestions}.c`);

      if (!questionExist) {
        return await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor("#f72f2f")
              .setTitle("NO ANSWER! WRONG QUESTION")
              .setDescription(
                `Choose one of these questions:\n${questions.join("\n")}\nTry to avoid including the ".c"`,
              )
              .setThumbnail(
                "https://lms.binus.ac.id/static/media/WARNING_REV.f968abeb.png",
              ),
          ],
        });
      }

      // Fetch the code for the selected question
      const githubFullURL = {
        url: `https://raw.githubusercontent.com/hiyokun-d/university-task/main/${selectedChapter}/${selectedQuestions}.c`,
        method: "GET",
      };
      const lastReq = await axios.request(githubFullURL);
      const codeData = lastReq.data;

      // Send a reply to the user with the question
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("#13cdf2")
            .setTitle(
              `Code Reference (${selectedChapter} - ${selectedQuestions})`,
            )
            .setDescription(
              `I’ve sent the code to your DMs! Please check your direct messages.`,
            )
            .setTimestamp()
            .setThumbnail(
              "https://cdn-binusacid.azureedge.net/assets/binus-2022-274-support/image/cody.gif",
            ),
        ],
      });

      // Send the code in a DM
      await interaction.user.send({
        embeds: [
          new EmbedBuilder()
            .setColor("#13cdf2")
            .setTitle(
              `Code Reference (${selectedChapter} - ${selectedQuestions})`,
            )
            .setDescription(
              `Here is the reference code for the question. I encourage you to solve the problem yourself first. Here's the code:\n\`\`\`c\n${codeData}\n\`\`\``,
            )
            .setTimestamp()
            .setThumbnail(
              "https://cdn-binusacid.azureedge.net/assets/binus-2022-274-support/image/cody.gif",
            ),
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
