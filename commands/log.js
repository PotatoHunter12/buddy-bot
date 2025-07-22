const fetchMessageCounts = require('../utils/fetchMessageCounts');

module.exports = {
  name: 'log',
  description: 'Count messages per user in this channel',
  async execute(interaction) {
    await interaction.reply('Counting messages, please wait...');
    const channel = interaction.channel;
    const counts = await fetchMessageCounts(channel);

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    sorted.push(sorted.shift())
    
    const result = sorted.map(([user, count]) => `${user}: ${count}`)
      .join('\n');
    
    
    await interaction.editReply(`**Message counts:**\n${result}**`);
  },
};