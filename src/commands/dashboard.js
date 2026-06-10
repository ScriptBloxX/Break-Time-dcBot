const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const supabase = require('../database/supabase');

function formatGroup(groupObj) {
    const keys = Object.keys(groupObj);
    if (keys.length === 0) return "> *None*";

    let resultString = "";
    
    for (const timeRange of keys) {
        const users = groupObj[timeRange];
        let line = `**[${timeRange}]** : ${users.join(', ')}`;
        
        if (line.length > 800) {
            const visibleUsers = users.slice(0, 15);
            const hiddenCount = users.length - 15;
            line = `**[${timeRange}]** : ${visibleUsers.join(', ')} ...and ${hiddenCount} more`;
        }
        
        resultString += line + "\n";
    }
    
    return resultString;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('View today\'s break schedule and status for everyone.'),
    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const guildId = interaction.guildId;
        const today = new Date().toISOString().split('T')[0];

        try {
            const { data: employees, error: empError } = await supabase
                .from('employees')
                .select('*')
                .eq('guild_id', guildId)
                .order('default_start_time', { ascending: true });

            if (empError || !employees || employees.length === 0) {
                return interaction.editReply({ content: '❌ No break schedules found for this server.' });
            }

            const { data: dailyLogs, error: logError } = await supabase
                .from('daily_logs')
                .select('*')
                .eq('guild_id', guildId)
                .eq('break_date', today);

            const groups = {
                onBreak: {},
                pending: {},
                completed: {}
            };

            employees.forEach(emp => {
                const log = dailyLogs?.find(l => l.discord_id === emp.discord_id);
                
                const timeStr = emp.default_start_time.slice(0, 5);
                const [h, m] = timeStr.split(':').map(Number);
                const endMins = (h * 60) + m + emp.quota_minutes;
                const endH = Math.floor(endMins / 60) % 24;
                const endM = endMins % 60;
                const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
                const timeRange = `${timeStr}-${endTimeStr}`;

                const userTag = `<@${emp.discord_id}>`;

                let targetGroup;
                if (log) {
                    if (log.status === 'on_break') targetGroup = groups.onBreak;
                    else if (log.status === 'completed') targetGroup = groups.completed;
                } else {
                    targetGroup = groups.pending;
                }

                if (targetGroup) {
                    if (!targetGroup[timeRange]) {
                        targetGroup[timeRange] = [];
                    }
                    targetGroup[timeRange].push(userTag);
                }
            });

            const dashboardEmbed = new EmbedBuilder()
                .setTitle('📊 Daily Break Dashboard')
                .setColor('#22d3ee')
                .setDescription(`Summary of today’s employee break schedule`)
                .addFields(
                    { name: '☕ Currently On Break', value: formatGroup(groups.onBreak) || '> *None*', inline: false },
                    { name: '⏳ Pending (Upcoming)', value: formatGroup(groups.pending) || '> *None*', inline: false },
                    { name: '✅ Completed Today', value: formatGroup(groups.completed) || '> *None*', inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [dashboardEmbed] });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ An error occurred while generating the dashboard.' });
        }
    },
};
