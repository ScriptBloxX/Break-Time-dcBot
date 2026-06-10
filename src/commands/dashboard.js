const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../database/supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('View today\'s break schedule and status for everyone.'),
    async execute(interaction) {
        const guildId = interaction.guildId;
        const today = new Date().toISOString().split('T')[0];

        const { data: employees, error: empError } = await supabase
            .from('employees')
            .select('*')
            .eq('guild_id', guildId)
            .order('default_start_time', { ascending: true });

        if (empError || !employees || employees.length === 0) {
            return interaction.reply({
                content: '❌ No break schedules found for this server.',
                flags: 64
            });
        }

        const { data: dailyLogs, error: logError } = await supabase
            .from('daily_logs')
            .select('*')
            .eq('guild_id', guildId)
            .eq('break_date', today);

        const onBreak = [];
        const completed = [];
        const pending = [];

        employees.forEach(emp => {
            const log = dailyLogs?.find(l => l.discord_id === emp.discord_id);
            const timeStr = emp.default_start_time.slice(0, 5);

            if (log) {
                if (log.status === 'on_break') {
                    onBreak.push(`> <@${emp.discord_id}> (Started at ${timeStr})`);
                } else if (log.status === 'completed') {
                    completed.push(`> <@${emp.discord_id}>`);
                }
            } else {
                pending.push(`> <@${emp.discord_id}> (Scheduled: ${timeStr})`);
            }
        });

        let replyMsg = `📊 **Daily Break Dashboard**\n\n`;

        replyMsg += `☕ **Currently On Break:**\n`;
        replyMsg += onBreak.length > 0 ? onBreak.join('\n') : `> *None*`;
        replyMsg += `\n\n`;

        replyMsg += `⏳ **Pending (Upcoming):**\n`;
        replyMsg += pending.length > 0 ? pending.join('\n') : `> *None*`;
        replyMsg += `\n\n`;

        replyMsg += `✅ **Completed Today:**\n`;
        replyMsg += completed.length > 0 ? completed.join('\n') : `> *None*`;

        await interaction.reply({
            content: replyMsg,
            flags: 64 
        });
    },
};
