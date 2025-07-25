const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const welcomeChannelId = '508577166007730186';
const goodbyeChannelId = '1009115321388515403';

if (process.env.BETA == 1) {
  welcomeChannelId = '1049440127480496160';
  goodbyeChannelId = '1049440127480496160';
} 

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
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

client.on('guildMemberAdd', async member => {
    const channel = member.guild.channels.cache.get(welcomeChannelId);
    if (channel) {
        channel.send(`Doeran, <@${member.id}> <:doeran:1009551654988816394>!`);
    }
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (process.env.BETA == 1) return; 

    if (message.content.toLowerCase() === 'aaa') {
        const a = Math.floor(Math.random() * 10000) > 1 ? "a":"b";
        const len = Math.floor(Math.random() * 300) + 1;
        const isUpper = Math.random() < 0.5;
        const aaa = (isUpper ? a.toUpperCase() : a).repeat(len);
        
        message.channel.send(aaa); 
    }
    // if (message.author.id === '344080041501786115') {
    //     const mockMessage = mock(message.content);
    //     message.channel.send(mockMessage);
    // }
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

client.on('guildMemberRemove', async member => {
    const channel = member.guild.channels.cache.get(goodbyeChannelId);
    if (!channel) return;

    let title = 'Member Left 👋';
    let action = 'left the server';
    let reason = 'No reason provided';

    try {
        const kickLogs = await member.guild.fetchAuditLogs({ limit: 1, type: 20 });
        const kickLog = kickLogs.entries.first();
        if (kickLog) {
            const { target, createdTimestamp, reason: kickReason, executor } = kickLog;
            if (target.id === member.id && Date.now() - createdTimestamp < 5000) {
                title = 'Member Kicked 🦶';
                action = `was kicked by <@${executor.id}>`;
                reason = kickReason || 'No reason provided';
            }
        }

        const banLogs = await member.guild.fetchAuditLogs({ limit: 1, type: 22 });
        const banLog = banLogs.entries.first();
        if (banLog) {
            const { target, createdTimestamp, reason: banReason, executor } = banLog;
            if (target.id === member.id && Date.now() - createdTimestamp < 5000) {
                title = 'Member Banned 🔨';
                action = `was banned by <@${executor.id}>`;
                reason = banReason || 'No reason provided';
            }
        }
    } catch (err) {
        console.error('Error fetching audit logs for kick detection:', err);
    }

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(`<@${member.id}> (${member.user.tag}) ${action}.`)
        .setThumbnail(member.user.displayAvatarURL())
        .setColor(action === 'left the server' ? 0xED4245 : 0xFEE75C)
        .setTimestamp();
    if (action !== 'left the server') {
      embed.addFields({ name: 'Reason', value: reason });
}

    channel.send({ embeds: [embed] });
});


const mock = str => str
  .split('')
  .map(l => Math.random() < 0.5 && l.toUpperCase() || l.toLowerCase())
  .join('')
