const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../database/supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mybreak')
        .setDescription('Check your break quota and today\'s status'),
    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });
        
        const guildId = interaction.guildId;
        const discordId = interaction.user.id;

        try {
            const { data: employee, error: empError } = await supabase
                .from('employees')
                .select('quota_minutes, default_start_time')
                .eq('guild_id', guildId)
                .eq('discord_id', discordId)
                .single();

            if (empError || !employee) {
                return interaction.editReply({
                    content: '❌ You haven\'t set a break time yet. Please use `/setbreak` first.'
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
            
            const startTotalMinutes = (hour * 60) + minute;
            const endTotalMinutes = startTotalMinutes + employee.quota_minutes;
            
            const endHour = Math.floor(endTotalMinutes / 60) % 24;
            const endMinute = endTotalMinutes % 60;
            
            const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
            const timeRange = `${breakTime}-${endTime}`;

            const replyMsg = `📊 **Your Break Status**\n` +
                             `👤 **Employee:** <@${discordId}>\n` +
                             `⏱️ **Daily Quota:** ${employee.quota_minutes} minutes\n` +
                             `⏰ **Scheduled Time:** ${timeRange}\n` +
                             `📌 **Today's Status:** ${statusText}`;

            await interaction.editReply({ content: replyMsg });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ An error occurred while fetching your data.' });
        }
    },
};
