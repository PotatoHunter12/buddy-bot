async function fetchWeeklyCounts(channel) {
    let counts = {};
    let daily = {};
    let threads = {};
    let members;

    let reactionTotals = {};     
    let reactionGiven = {};      
    let reactionReceived = {}; 

    try {
        members = await channel.guild.members.fetch({ limit: 100 });
    } catch (err) {
        console.error(`Failed to fetch members for ${channel.guild.name}:`, err);
        return { counts: {}, daily: {}, /* ... */ };
    }
    const week = Date.now() - 604800000;

    async function countMessages(messageManager) {
        let lastId = null;
        let curCount = 0;
        while (true) {
            const fetchOptions = { limit: 100 };
            if (lastId) fetchOptions.before = lastId;
            const fetched = await messageManager.fetch(fetchOptions);
            if (fetched.size === 0) break;
 
            for (const msg of fetched.values()) {
                if (msg.createdTimestamp < week) return curCount-1;
                if (msg.author.bot) continue;
                const user = msg.author.id;
                if (!members.get(user)) continue;

                counts[user] = (counts[user] || 0) + 1;
                curCount++;

                const day = new Date(msg.createdTimestamp).toISOString().split('T')[0];
                daily[day] = (daily[day] || 0) + 1;

                for (const reaction of msg.reactions.cache.values()) {
                    const emojiKey = reaction.emoji.id ? `${reaction.emoji.name}:${reaction.emoji.id}` : reaction.emoji.name;
                    reactionTotals[emojiKey] = (reactionTotals[emojiKey] || 0) + (reaction.count || 0);

                    const users = await fetchReactionUsers(reaction);
                    for (const u of users.values()) {
                        if (u.bot) continue;
                        reactionGiven[u.id] = (reactionGiven[u.id] || 0) + 1;
                        reactionReceived[user] = (reactionReceived[user] || 0) + 1;
                    }
                }
            }

            lastId = fetched.last().id;
            if (fetched.size < 100) break;
        }
        return curCount-1;
    }

    async function fetchReactionUsers(reaction) {
      const users = new Map();
      try {
        while (true) {
          const fetched = await reaction.users.fetch({ limit: 100 });
          for (const u of fetched.values()) users.set(u.id, u);
          if (fetched.size < 100) break;
        }
      } catch (err) {
        console.warn('Failed to fetch reaction users:', err);
      }
      
      return users;
    }

    await countMessages(channel.messages);

    if (channel.threads) {
        const activeThreads = await channel.threads.fetchActive();
        for (const thread of activeThreads.threads.values()) {
            const threadCount = await countMessages(thread.messages);
            let starter;
            try {
                starter = await thread.fetchStarterMessage()
                console.log("Log command executed in thread:",thread.name);
                
            } catch (error) {
                console.log("Failed to fetch starter message for thread:", thread.name);
                continue;
            }
            
            
            threads[thread.id] = { user: starter.author.id, count: threadCount };
        }   
    }

    return { 
        counts, 
        daily, 
        reactionTotals, 
        reactionGiven,
        reactionReceived,
        threads
    };
}

module.exports = fetchWeeklyCounts;