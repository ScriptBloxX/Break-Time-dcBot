const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../database/supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mybreak')
        .setDescription('Check your break quota and today\'s status'),
    async execute(interaction) {
        const guildId = interaction.guildId;
        const discordId = interaction.user.id;

        const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('quota_minutes, default_start_time')
            .eq('guild_id', guildId)
            .eq('discord_id', discordId)
            .single();

        if (empError || !employee) {
            return interaction.reply({
                content: '❌ You haven\'t set a break time yet. Please use `/setbreak` first.',
                flags: 64
            });
        }

        const today = new Date().toISOString().split('T')[0]; 
        const { data: dailyLog, error: logError } = await supabase
            .from('daily_logs')
            .select('status')
            .eq('guild_id', guildId)
            .eq('discord_id', discordId)
            .eq('break_date', today)
            .single();

        let statusText = '⏳ Pending';
        if (dailyLog) {
            if (dailyLog.status === 'on_break') statusText = '☕ On Break';
            if (dailyLog.status === 'completed') statusText = '✅ Completed';
        }

        const breakTime = employee.default_start_time.slice(0, 5);
        const [hour, minute] = breakTime.split(':').map(Number);
        const endHour = (hour + 1) % 24;
        const endTime = `${String(endHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const timeRange = `${breakTime}-${endTime}`;

        const replyMsg = `📊 **Your Break Status**\n` +
                         `👤 **User:** <@${discordId}>\n` +
                         `⏱️ **Daily Quota:** ${employee.quota_minutes} minutes\n` +
                         `⏰ **Scheduled Time:** ${timeRange}\n` +
                         `📌 **Today's Status:** ${statusText}`;

        await interaction.reply({
            content: replyMsg,
            flags: 64
        });
    },
};
