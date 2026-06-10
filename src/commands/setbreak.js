const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../database/supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setbreak')
        .setDescription('Set your daily break schedule (default quota starts at 1 hour)')
        .addStringOption(option =>
            option.setName('time')
                .setDescription('Start time for break (use HH:MM format, e.g. 12:00, 13:30)')
                .setRequired(true)
        ),
    async execute(interaction) {
        const timeString = interaction.options.getString('time');
        const guildId = interaction.guildId;
        const discordId = interaction.user.id;

        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(timeString)) {
            return interaction.reply({ 
                content: '❌ Invalid time format. Please use 24-hour format (e.g. `12:00`, `13:30`)',
                flags: 64 
            });
        }

        const { error } = await supabase
            .from('employees')
            .upsert({
                guild_id: guildId,
                discord_id: discordId,
                default_start_time: timeString + ':00'
            }, { onConflict: 'guild_id, discord_id' });

        if (error) {
            console.error('Database Error:', error);
            return interaction.reply({ 
                content: '❌ An error occurred while saving data to the database',
                flags: 64 
            });
        }

        await interaction.reply({
            content: `✅ Your break time has been set to **${timeString}** successfully! (The bot will DM you daily to remind you at this time.)`,
            flags: 64
        });
    },
};