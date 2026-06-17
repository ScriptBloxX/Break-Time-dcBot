const { Events, EmbedBuilder } = require('discord.js');
const { fetchAqiData } = require('../utils/aqiHelper');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {

        if (interaction.isButton()) {
            
            if (interaction.customId.startsWith('aqi_tips_')) {
                const level = interaction.customId.replace('aqi_tips_', '');
                let tipMsg = '';
                
                switch (level) {
                    case 'good': tipMsg = '🟢 **Good:** Air quality is great! Enjoy your outdoor activities.'; break;
                    case 'moderate': tipMsg = '🟡 **Moderate:** Air quality is acceptable. Sensitive individuals should limit prolonged outdoor exertion.'; break;
                    case 'sensitive': tipMsg = '🟠 **Unhealthy for Sensitive Groups:** Wear a mask if you have respiratory issues. Reduce outdoor exercise.'; break;
                    case 'unhealthy': tipMsg = '🔴 **Unhealthy:** Everyone should wear an N95 mask outdoors. Avoid intense outdoor activities.'; break;
                    case 'very_unhealthy': tipMsg = '🟪 **Very Unhealthy:** Health alert! Stay indoors, close windows, and use an air purifier if possible.'; break;
                    case 'hazardous': tipMsg = '🟤 **Hazardous:** Emergency conditions! Do not go outside. High risk to everyone.'; break;
                    default: tipMsg = 'ℹ️ No specific tips available.';
                }
                
                return interaction.reply({ content: tipMsg, flags: 64 });
            }

            if (interaction.customId.startsWith('aqi_refresh_')) {
                await interaction.deferUpdate();
                const location = interaction.customId.replace('aqi_refresh_', '');

                try {
                    const aqiData = await fetchAqiData(location);

                    const newEmbed = new EmbedBuilder()
                        .setTitle(`🌤️ Air Quality in ${aqiData.cityName}`)
                        .setColor(aqiData.info.color)
                        .setDescription(`**Status:** ${aqiData.info.emoji} ${aqiData.info.status}`)
                        .addFields(
                            { name: 'US AQI', value: `**${aqiData.aqi}**`, inline: true },
                            { name: 'PM 2.5', value: `**${aqiData.pm25}** µg/m³`, inline: true },
                            { name: 'Temperature', value: `**${aqiData.temp}**`, inline: true }
                        )
                        .setFooter({ text: `Data provided by WAQI | Last updated: ${aqiData.updatedAt}` })
                        .setTimestamp();

                    return interaction.editReply({ embeds: [newEmbed], components: interaction.message.components });

                } catch (error) {
                    console.error('Refresh Error:', error.message);
                    return interaction.followUp({ content: '❌ Failed to refresh the latest data.', flags: 64 });
                }
            }
        }

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
    }
};
