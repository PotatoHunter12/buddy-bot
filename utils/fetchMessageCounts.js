async function fetchMessageCounts(channel) {
    let counts = {};
    let members = await channel.guild.members.fetch();

    async function countMessages(messageManager) {
        let lastId = null;
        
        while (true) {
            let fetchOptions = { limit: 100 };
            if (lastId) fetchOptions.before = lastId;
            const fetched = await messageManager.fetch(fetchOptions);
            if (fetched.size === 0) break;

            for (const msg of fetched.values()) {
                if (msg.author.bot) continue;
                const user = msg.author.id;
                if (!members.get(user)) continue;
                counts[user] = (counts[user] || 0) + 1;
                
            }

            lastId = fetched.last().id;
            if (fetched.size < 100) break;
        }
    }

    // Count messages in the main channel
    await countMessages(channel.messages);
    
    await channel.threads.fetch();    

    // Count messages in threads
    if (channel.threads) {
        const activeThreads = await channel.threads.fetchActive();
        for (const thread of activeThreads.threads.values()) {
            await countMessages(thread.messages);
        }
        const archivedThreads = await channel.threads.fetchArchived();
        for (const thread of archivedThreads.threads.values()) {
            await countMessages(thread.messages);
        }
    }

    return counts;
}

module.exports = fetchMessageCounts;