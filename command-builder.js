const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('log')
    .setDescription('Count messages per user in this channel')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('log-weekly') 
    .setDescription('Count messages per user in this channel this week')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete messages in this channel')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of messages to delete (default: 10)')
        .setMinValue(1)
        .setMaxValue(1000)
    )
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Only delete messages from this user')
    ),
  new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Set a reminder')
    .addStringOption(option =>
      option.setName('time')
        .setDescription('When to remind you (e.g. 15, 2h, 1d, 16:45, 16:45 27.07.2025)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Reminder message')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName('dm')
        .setDescription('Send reminder to DM (default: false)')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('reaction-roles')
    .setDescription('Send a message with reaction roles')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Message to display')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('emotes')
        .setDescription('Comma-separated emote list (e.g. 😀,😎, ...)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('roles')
        .setDescription('Comma-separated role list (e.g. @role1, @role2, ...)')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('help')  
    .setDescription('Show all commands and what they do')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('diploma')
    .setDescription('Lock in fr')
    .toJSON()
    
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN_MAIN);

(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID_MAIN),
      { body: commands }
    );
    console.log('Slash commands registered!');
  } catch (error) {
    console.error(error);
  }
})();