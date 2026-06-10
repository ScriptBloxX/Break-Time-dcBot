const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.channel.name !== 'command') {
            return interaction.reply({ 
                content: '❌ Sorry, please use bot commands only in the command channel.', 
                ephemeral: true 
            });
        }

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`Command not found: ${interaction.commandName}`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '❌ An error occurred while executing this command!', ephemeral: true });
            } else {
                await interaction.reply({ content: '❌ An error occurred while executing this command!', ephemeral: true });
            }
        }
    },
};
