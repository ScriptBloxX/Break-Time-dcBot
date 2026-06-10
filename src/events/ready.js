const { Events } = require('discord.js');
const { startCronJobs } = require('../jobs/breakNotifier');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`✅ Ready! Logged in as ${client.user.tag}`);
        startCronJobs(client);
    },
};
