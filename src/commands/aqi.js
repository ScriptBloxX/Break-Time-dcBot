const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { fetchAqiData } = require('../utils/aqiHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aqi')
        .setDescription('Check real-time Air Quality Index (AQI) and PM 2.5')
        .addStringOption(option =>
            option.setName('location')
                .setDescription('Enter city or province (e.g., Bangkok, Chiang Mai)')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        const location = interaction.options.getString('location');
        const geoapifyToken = process.env.GEOAPIFY_KEY;

        try {
            const aqiData = await fetchAqiData(location);

            const aqiEmbed = new EmbedBuilder()
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

            if (geoapifyToken && aqiData.lat && aqiData.lng) {
                const pinColor = aqiData.info.color.replace('#', '');
                const lat = aqiData.lat;
                const lng = aqiData.lng;
                const mapUrl = `https://maps.geoapify.com/v1/staticmap?style=dark-matter&width=600&height=350&center=lonlat:${lng},${lat}&zoom=11&marker=lonlat:${lng},${lat};color:%23${pinColor};size:x-large&apiKey=${geoapifyToken}`;
                aqiEmbed.setImage(mapUrl);
            }

            const refreshBtn = new ButtonBuilder()
                .setCustomId(`aqi_refresh_${location}`)
                .setLabel('Refresh Data')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Primary);

            const tipsBtn = new ButtonBuilder()
                .setCustomId(`aqi_tips_${aqiData.info.level}`)
                .setLabel('Health Tips')
                .setEmoji('😷')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(refreshBtn, tipsBtn);

            await interaction.editReply({ embeds: [aqiEmbed], components: [row] });

        } catch (error) {
            console.error('AQI Command Error:', error.message);
            if (error.message === 'MISSING_TOKEN') {
                await interaction.editReply('❌ System Error: WAQI_TOKEN is missing in the `.env` file.');
            } else if (error.message === 'NOT_FOUND') {
                await interaction.editReply(`❌ Could not find air quality data for **${location}**. Please try another spelling.`);
            } else {
                await interaction.editReply('❌ An error occurred while fetching data from the API.');
            }
        }
    },
};
