const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'help',
  description: 'Show all commands and what they do',
  async execute(interaction) {
    // Get all commands and their descriptions
    const commandsDir = path.join(__dirname);
    const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));
    let commandsList = [];

    for (const file of commandFiles) {
      const command = require(path.join(commandsDir, file));
      if (command.name && command.description) {
        commandsList.push(`**/${command.name}** — ${command.description}`);
      }
    }
    const textTriggers = [
      "`aaa` — Spams some aaa's to support you in your time of need",
    ];

    const embed = new EmbedBuilder()
      .setTitle("Buddy's Command List")
      .setDescription('Here are all available commands:')
      .addFields(
        { name: '**Slash Commands**', value: commandsList.join('\n') || 'None found', inline: false },
        { name: '**Text Commands**', value: textTriggers.join('\n') || 'None found', inline: false }
      )
      .setColor(0x5865F2);

    await interaction.reply({ embeds: [embed] });
  },
};