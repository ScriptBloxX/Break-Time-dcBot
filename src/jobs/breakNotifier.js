const cron = require('node-cron');
const supabase = require('../database/supabase');

async function checkEndingBreaks(client, now) {
    try {
        const { data: activeLogs, error: activeError } = await supabase
            .from('daily_logs')
            .select('*')
            .eq('status', 'on_break');

        if (!activeError && activeLogs && activeLogs.length > 0) {
            for (const log of activeLogs) {
                const { data: empData } = await supabase
                    .from('employees')
                    .select('quota_minutes')
                    .eq('guild_id', log.guild_id)
                    .eq('discord_id', log.discord_id)
                    .single();
                
                const quota = empData ? empData.quota_minutes : 60;
                const startTime = new Date(log.actual_start);
                const endTime = new Date(startTime.getTime() + quota * 60 * 1000);
                
                if (now >= endTime) {
                    await supabase
                        .from('daily_logs')
                        .update({ status: 'completed', actual_end: now.toISOString() })
                        .eq('id', log.id);

                    try {
                        const user = await client.users.fetch(log.discord_id);
                        const guild = await client.guilds.fetch(log.guild_id);
                        const serverName = guild ? guild.name : 'Your Server';
                        await user.send(`🚨 **Break time is over!**\nCompany: **${serverName}**\nPlease return to your work immediately. Let's get it!\n---------------------------------------`);
                    } catch (err) {
                        console.log(`[Warning] Can't send DM to ${log.discord_id}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error in checkEndingBreaks:', error);
    }
}

async function checkStartingBreaks(client, now, today, currentTime) {
    try {
        const { data: employeesToStart, error: empError } = await supabase
            .from('employees')
            .select('*')
            .eq('default_start_time', `${currentTime}:00`);

        if (!empError && employeesToStart && employeesToStart.length > 0) {
            for (const emp of employeesToStart) {
                const { data: existingLog } = await supabase
                    .from('daily_logs')
                    .select('id')
                    .eq('guild_id', emp.guild_id)
                    .eq('discord_id', emp.discord_id)
                    .eq('break_date', today)
                    .single();

                if (existingLog) continue; 

                const { error: insertError } = await supabase
                    .from('daily_logs')
                    .insert({
                        guild_id: emp.guild_id,
                        discord_id: emp.discord_id,
                        status: 'on_break',
                        actual_start: now.toISOString()
                    });

                if (!insertError) {
                    try {
                        const user = await client.users.fetch(emp.discord_id);
                        const guild = await client.guilds.fetch(emp.guild_id);
                        const serverName = guild ? guild.name : 'Your Server';
                        await user.send(`☕ **Time for a break!**\nCompany: **${serverName}**\nYou have ${emp.quota_minutes} minutes. Enjoy your rest!\n---------------------------------------`);
                    } catch (err) {
                        console.log(`[Warning] Can't send DM to ${emp.discord_id}`);
                    }
                }
            }
        }
    } catch (error) {
         console.error('Error in checkStartingBreaks:', error);
    }
}

function startCronJobs(client) {
    console.log('⏳ Starting Break Notifier Engine...');

    console.log('🧹 Running Boot Catch-up for missed break endings...');
    checkEndingBreaks(client, new Date());

    cron.schedule('* * * * *', async () => {
        const now = new Date();
        const options = { timeZone: 'Asia/Bangkok', hour12: false, hour: '2-digit', minute: '2-digit' };
        const currentTime = new Intl.DateTimeFormat('en-US', options).format(now);
        const today = now.toISOString().split('T')[0];

        await checkStartingBreaks(client, now, today, currentTime);
        
        await checkEndingBreaks(client, now);
    });
}

module.exports = { startCronJobs };
