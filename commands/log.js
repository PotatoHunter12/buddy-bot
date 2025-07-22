const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'log',
  description: 'Export channel log and count messages per user',
  async execute(interaction) {
    const channelId = interaction.channel.id;
    const token = process.env.DISCORD_TOKEN;
    const outputPath = path.join(__dirname, `log-${channelId}.json`);

    // Export channel history as JSON
    exec(`DiscordChatExporter.CLI.exe export -t ${token} -c ${channelId} -f Json -o "${outputPath}"`, async (err) => {
      if (err) {
        await interaction.reply('Failed to export channel log.');
        return;
      }

      // Read and parse the exported JSON
      const data = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      const counts = {};

      for (const message of data.messages) {
        const user = message.author.name;
        counts[user] = (counts[user] || 0) + 1;
      }

      // Format the result
      const result = Object.entries(counts)
        .map(([user, count]) => `${user}: ${count}`)
        .join('\n');

      await interaction.reply(`Message counts:\n${result}`);
      fs.unlinkSync(outputPath); // Clean up
    });
  },
};