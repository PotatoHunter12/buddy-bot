const fetchMessageCounts = require('../utils/fetchMessageCounts');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'log',
  description: 'Count messages per user in this channel',
  async execute(interaction) {
    await interaction.reply('Counting messages, please wait...');
    const t = Date.now();
    const channel = interaction.channel;
    const counts = await fetchMessageCounts(channel);
    const members = await channel.guild.members.fetch();

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    sorted.push(sorted.shift())
    
    const result = sorted.map(([user, count]) => `**${members.get(user)?.nickname || "\nTotal**"}:** ${count}`)
      .join('\n');
    
    const embed = new EmbedBuilder()
      .setTitle(`Message Count in #${channel.name}:`)
      .setDescription(
        sorted.length > 0
          ? `${result}**`
          : 'No user messages found in this channel.'
      )
      .setColor(0x5865F2)
      .setTimestamp();

    await interaction.channel.send({ content: null, embeds: [embed] });
    console.log(`Log command executed in ${channel.guild.name}/${channel.name}: ` + (Date.now() - t) + "ms");
  },
};