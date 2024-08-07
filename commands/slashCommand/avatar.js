const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Check user avatar')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Check another user')
                .setRequired(false)),
    async execute(bot, interaction) {
        try {
            let user = interaction.options.getUser('user') || interaction.user;
            
            // Check if the user exists
            if (!user) {
                await interaction.reply({ content: 'User not found!', ephemeral: true });
                return;
            }

            // Get the avatar URL of the user
            const avatarURL = user.displayAvatarURL({ dynamic: true, format: 'png', size: 4096 });

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
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: `There was an error while executing the command: \`${error.message}\``, ephemeral: true });
        }
    },
};