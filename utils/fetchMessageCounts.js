const { Collection } = require('discord.js');

async function fetchMessageCounts(channel) {
    let counts = [] ;
    
    let lastId = null;
    let fetchOptions = { limit: 100 };
    let members = await channel.guild.members.fetch();

    while (true) {
        if (lastId) fetchOptions.before = lastId;
        const fetched = await channel.messages.fetch(fetchOptions);
        if (fetched.size === 0) break;
        fetched.forEach(msg => {
            if (msg.author.bot) return;
            const user = msg.author.id; 
            if (!members.get(user)) return;
            counts[user] = (counts[user] || 0) + 1;
        });

        lastId = fetched.last().id;
        if (fetched.size < 100) break;
    }
    
    return counts;
}

module.exports = fetchMessageCounts;