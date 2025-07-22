const { Collection } = require('discord.js');

async function fetchMessageCounts(channel) {
  let counts = {};
  let lastId = null;
  let fetchOptions = { limit: 100 };

  while (true) {
    if (lastId) fetchOptions.before = lastId;
    const fetched = await channel.messages.fetch(fetchOptions);
    if (fetched.size === 0) break;

    fetched.forEach(msg => {
      const user = msg.author.username;
      counts[user] = (counts[user] || 0) + 1;
    });

    lastId = fetched.last().id;
    if (fetched.size < 100) break;
  }

  return counts;
}

module.exports = fetchMessageCounts;