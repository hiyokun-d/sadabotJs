const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require("axios");

const githubURL = {
  url: 'https://api.github.com/repos/hiyokun-d/university-task/contents/',
  method: "GET"
};

async function fetchChoices() {
  try {
    const req = await axios.request(githubURL);
    const chapters = req.data.filter(a => a.name.startsWith("chapter"));
    return chapters.map(a => ({
      name: a.name,
      value: a.name
    }));
  } catch (error) {
    console.error('Error fetching choices:', error);
    return [];
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help-onlinejudge')
    .setDescription('Help you to answer your online judge')
    .addStringOption(option =>
      option
        .setName("chapter")
        .setDescription("what chapter you want follow this example: D6823-FYP_CSP-AE Fundamental-JKT (chapter1)")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("questions")
        .setDescription("what answer of question do you really need?")
        .setRequired(true)
    ),

  async execute(bot, interaction) {
    try {
      const choices = await fetchChoices();
      const selectedChapter = interaction.options.getString('chapter', true);
      const selectedQuestions = interaction.options.getString("questions", true)
      const chapterExists = choices.some(c => c.value === selectedChapter);
      // https://raw.githubusercontent.com/hiyokun-d/university-task/main/chapter1/a.c

      if (!chapterExists) {
        return await interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor("#f72f2f")
            .setTitle("NO ANSWER! WRONG CHAPTER")
            .setDescription(`choose one of these chapter \n ${choices.map(c => c.name).join('\n')}`)
            .setThumbnail("https://lms.binus.ac.id/static/media/WARNING_REV.f968abeb.png")
          ]
        });
      }

      const URLquestions = {
        url: `https://api.github.com/repos/hiyokun-d/university-task/contents/${selectedChapter}/`,
        method: "get"
      }

      const questionsReq = await axios.request(URLquestions)

      const questionFilter = questionsReq.data.filter(a => a.name.endsWith(".c"));
      const questions = questionFilter.map(m => m.name);

      // Check if the selected question exists in the list of questions
      const questionExist = questions.includes(selectedQuestions + ".c"); // Change here

      if (!questionExist) {
        return await interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor("#f72f2f")
            .setTitle("NO ANSWER! WRONG QUESTION")
            .setDescription(`Choose one of these questions: \n${questions.join('\n')}`)
            .setThumbnail("https://lms.binus.ac.id/static/media/WARNING_REV.f968abeb.png")
          ]
        });
      }

      const githubFullURL = {
        url: `https://raw.githubusercontent.com/hiyokun-d/university-task/main/${selectedChapter}/${selectedQuestions}.c`,
        method: "get"
      }

      const lastReq = await axios.request(githubFullURL)
      const codeData = lastReq.data
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor("#13cdf2")
          .setTitle("Code reference")
          .setDescription(`Before you copy this into your code, you might want to try solving it yourself. This code is provided as a reference for how I approached this question. I trust you, buddy! \n\n\n Here the code read it wisely: \`\`\`c\n${codeData}\n\`\`\``)
          .setTimestamp()
          .setThumbnail("https://cdn-binusacid.azureedge.net/assets/binus-2022-274-support/image/cody.gif")
        ]
      });

    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: `There was an error while executing the command: \`${error.message}\``,
        ephemeral: true
      });
    }
  },
};
