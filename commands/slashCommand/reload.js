const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    category: 'utility',
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reloads a command.')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('The command to reload.')
                .setRequired(true)),
    async execute(interaction) {
        try {
            const commandName = interaction.options.getString('command', true).toLowerCase();
            const command = interaction.client.slashcommands.get(commandName);

            if (!command) {
                return interaction.reply(`There is no command with name \`${commandName}\`!`);
            }

            const commandPath = `../slashCommand/${commandName}.js`;
            delete require.cache[require.resolve(commandPath)];

            const newCommand = require(commandPath);
            interaction.client.slashcommands.set(newCommand.data.name, newCommand);
            await interaction.reply(`Command \`${newCommand.data.name}\` was reloaded!`);
        } catch (error) {
            console.error(error);
            await interaction.reply(`There was an error while reloading a command:\n\`${error.message}\``);
        }
    },
};
