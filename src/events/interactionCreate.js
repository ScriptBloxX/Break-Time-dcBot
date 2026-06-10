const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {

        if (!interaction.isChatInputCommand()) return;

        try {
            if (!interaction.guild || !interaction.channel) {
                return interaction.reply({
                    content: '❌ This command can only be used in a server.',
                    flags: 64
                });
            }

            if (interaction.channel.name !== 'command') {
                return interaction.reply({
                    content: '❌ Please use bot commands in #command only.',
                    flags: 64
                });
            }

            const command = client.commands.get(interaction.commandName);

            if (!command) return;

            await command.execute(interaction, client);

        } catch (error) {
            console.error(error);

            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({
                    content: '❌ An error occurred while executing this command!',
                    flags: 64
                });
            } else {
                await interaction.reply({
                    content: '❌ An error occurred while executing this command!',
                    flags: 64
                });
            }
        }
    },
};