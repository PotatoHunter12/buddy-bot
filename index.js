const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

client.login(process.env.DISCORD_TOKEN)
    .then(() => console.log('Bot is online!'))
    .catch(err => console.error('Failed to login:', err));

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (message.content.toLowerCase() === 'log') {
        const msgLog = message.channel.messages.cache
            .filter(msg => !msg.author.bot)
        msgLog.forEach(msg => {
            console.log(`${msg.author.username}: ${msg.content}`);
        });
    }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'There was an error executing that command!', ephemeral: true });
  }
});

const mock = str => str
  .split('')
  .map(l => Math.random() < 0.5 && l.toUpperCase() || l.toLowerCase())
  .join('')
