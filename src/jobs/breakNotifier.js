const cron = require('node-cron');
const supabase = require('../database/supabase');

function startCronJobs(client) {
    console.log('⏳ Starting Break Notifier Cron Job...');

    cron.schedule('* * * * *', async () => {
        const now = new Date();
        const options = { timeZone: 'Asia/Bangkok', hour12: false, hour: '2-digit', minute: '2-digit' };
        const currentTime = new Intl.DateTimeFormat('en-US', options).format(now);
        const today = now.toISOString().split('T')[0];

        try {
            const { data: employees, error: empError } = await supabase
                .from('employees')
                .select('*')
                .eq('default_start_time', `${currentTime}:00`);

            if (empError || !employees || employees.length === 0) return;

            for (const emp of employees) {
                const { data: existingLog } = await supabase
                    .from('daily_logs')
                    .select('id')
                    .eq('guild_id', emp.guild_id)
                    .eq('discord_id', emp.discord_id)
                    .eq('break_date', today)
                    .single();

                if (existingLog) continue;

                const { data: newLog, error: insertError } = await supabase
                    .from('daily_logs')
                    .insert({
                        guild_id: emp.guild_id,
                        discord_id: emp.discord_id,
                        status: 'on_break',
                        actual_start: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (insertError) {
                    console.error('Error creating log:', insertError);
                    continue;
                }

                try {
                    const user = await client.users.fetch(emp.discord_id);
                    const guild = await client.guilds.fetch(emp.guild_id);
                    const serverName = guild ? guild.name : 'Your Server';

                    await user.send(`☕ **Time for a break!**\Company: **${serverName}**\nYou have ${emp.quota_minutes} minutes. Enjoy your rest!`);
                } catch (dmError) {
                    console.log(`[Warning] Can't send DM to ${emp.discord_id} (disable DM?)`);
                }

                const breakDurationMs = emp.quota_minutes * 60 * 1000;
                
                setTimeout(async () => {
                    const { data: currentLog } = await supabase
                        .from('daily_logs')
                        .select('status')
                        .eq('id', newLog.id)
                        .single();

                    if (currentLog && currentLog.status === 'on_break') {
                        await supabase
                            .from('daily_logs')
                            .update({ 
                                status: 'completed',
                                actual_end: new Date().toISOString()
                            })
                            .eq('id', newLog.id);

                        try {
                            const user = await client.users.fetch(emp.discord_id);
                            const guild = await client.guilds.fetch(emp.guild_id);
                            const serverName = guild ? guild.name : 'Your Server';

                            await user.send(`🚨 **Break time is over!**\Company: **${serverName}**\nPlease return to your work immediately. Let's get it!`);
                        } catch (dmError) {
                            console.log(`[Warning] Can't send DM to ${emp.discord_id} (disable DM?)`);
                        }
                    }
                }, breakDurationMs);
            }
        } catch (error) {
            console.error('Cron Job Error:', error);
        }
    });
}

module.exports = { startCronJobs };
