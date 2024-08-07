const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    cooldown: 3,
    data: new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('Replies the bot uptime'),

    async execute(bot, interaction) {
        try {
            // Get the bot's uptime in milliseconds
            const uptimeMs = bot.uptime;

            // Convert uptime to a readable format (hours, minutes, seconds)
            const totalSeconds = Math.floor(uptimeMs / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = Math.floor(totalSeconds % 60);

            // Format the uptime into a string
            const uptimeString = `${hours}h ${minutes}m ${seconds}s`;

            // Reply to the interaction with the bot's uptime
            await interaction.reply(`I have been awake and assisting you guys for: ${uptimeString}`);
        } catch (error) {
            console.error('Error in ping command:', error);
            await interaction.reply('There was an error while processing your command.');
        }
    },
};