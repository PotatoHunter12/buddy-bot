async function fetchWeeklyCounts(channel) {
    let counts = [];
    let lastId = null;
    let fetchOptions = { limit: 100 };
    let members = await channel.guild.members.fetch();
    const week = Date.now() - 604800000;

    while (true) {
        if (lastId) fetchOptions.before = lastId;
        const fetched = await channel.messages.fetch(fetchOptions);
        if (fetched.size === 0) break;

        for (const msg of fetched.values()) {
            if (msg.createdTimestamp < week) break;
            if (msg.author.bot) continue;
            const user = msg.author.id;
            if (!members.get(user)) continue;
            counts[user] = (counts[user] || 0) + 1;
        }

        lastId = fetched.last().id;
        if (fetched.size < 100) break;
    }

    return counts;
}

module.exports = fetchWeeklyCounts;