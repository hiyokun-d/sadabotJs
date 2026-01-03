const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Check user avatar")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Check another user")
        .setRequired(false),
    ),
  async execute(bot, interaction) {
    try {
      let user = interaction.options.getUser("user") || interaction.user;

      // Check if the user exists
      if (!user) {
        await interaction.reply({
          content: "User not found!",
          ephemeral: true,
        });
        return;
      }

      // Get the avatar URL of the user
      const avatarURL = user.displayAvatarURL({
        dynamic: true,
        format: "png",
        size: 4096,
      });

      // Create an embed with the user's avatar
      const embed = {
        color: 0x0099ff,
        title: `${user.tag}'s Avatar`,
        image: {
          url: avatarURL,
        },
      };

      // Reply with the embed showing the user's avatar
      await interaction.reply({ embeds: [embed] });
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

