const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../database/supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('earlyreturn')
        .setDescription('End your break early and return to work.'),
    async execute(interaction) {
        const guildId = interaction.guildId;
        const discordId = interaction.user.id;
        
        const today = new Date().toISOString().split('T')[0];

        const { data: log, error: fetchError } = await supabase
            .from('daily_logs')
            .select('*')
            .eq('guild_id', guildId)
            .eq('discord_id', discordId)
            .eq('break_date', today)
            .single();

        if (fetchError || !log || log.status !== 'on_break') {
            return interaction.reply({
                content: '❌ You are not currently on a break.',
                flags: 64
            });
        }

        const { error: updateError } = await supabase
            .from('daily_logs')
            .update({
                status: 'completed',
                actual_end: new Date().toISOString()
            })
            .eq('id', log.id);

        if (updateError) {
            console.error('Update Error:', updateError);
            return interaction.reply({
                content: '❌ An error occurred while updating your status.',
                flags: 64
            });
        }

        await interaction.reply({
            content: '✅ Welcome back! Your break has been ended early. Remaining time is forfeited.',
            flags: 64
        });
    },
};
