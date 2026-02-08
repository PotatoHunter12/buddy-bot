const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { Client, Collection, GatewayIntentBits, EmbedBuilder, Partials } = require('discord.js');
const reactionRolesManager = require('./utils/reactionRolesManager');
const { log } = require('console');
const supabase = require('./utils/supabaseClient');
const weeklyStats = require('./utils/weeklyStats');
require('dotenv').config();

const logChannelId = process.env.LOG_CHANNEL_ID;
const logGuildId = process.env.LOG_GUILD_ID;

const client = new Client({
  intents: [
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
});

let welcomeChannelId = '508577166007730186';
let goodbyeChannelId = '1009115321388515403';

let secretWord = true;

if (process.env.BETA == 1) {
  welcomeChannelId = '1049440127480496160';
  goodbyeChannelId = '1049440127480496160';
} 

const originalLog = console.log; 
console.log = (...data) => {
    originalLog(...data); // still log to terminal

    const channel = client.channels.cache.get(process.env.LOG_CHANNEL_ID);
    if (channel) channel.send(data.join(" ")).catch(err => originalLog("Log send error:", err));
};

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

client.login(process.env.DISCORD_TOKEN)
    .then(() => console.log('Buddy Bot is online!'))
    .catch(err => console.error('Failed to login:', err));
 
client.once('ready', async () => {
    console.log(`Bot is ready in ${client.guilds.cache.size} guilds.`);
    for (const guild of client.guilds.cache.values()) {
      try {
        await guild.members.fetch();
        console.log(`Cached members for ${guild.name}`);
      } catch (err) {
        console.warn(`Failed to cache members for ${guild.name}:`, err.message);
      }
    }

    await reactionRolesManager.init(client);
});

client.on('guildMemberAdd', async member => {
    if (process.env.BETA == 1) return;
    const channel = member.guild.channels.cache.get(welcomeChannelId);
    if (channel) {
        channel.send(`Doeran, <@${member.id}> <:doeran:1009551654988816394>!`);
    }
    if (member.user.bot) {
      await member.roles.add("1005816223784783885"); // 2
    } else {
      await member.roles.add("920797106925600820"); // 8
    }
});

cron.schedule('41 0 * * 1', () => { // weekly: "0 0 * * 1" testing: "*/5 * * * *"
    console.log('Running weekly stat log...');
    try {
        weeklyStats(client);
    } catch (error) {
        console.error('Error running weekly stat log:', error);
    }
}, { timezone: 'CET' });

cron.schedule('0 0 * * 3', () => {
  supabase.from('user_counts').select('*').limit(1).then(() => {
    console.log('Pinged db to keep it awake');
  });
}, { timezone: 'CET' });

cron.schedule('* * * * *', () => {
  supabase.from('locked_admins').select('*').then(({ data, error }) => {
    if (error) {
      console.log('Error fetching locked admins:', error);
      return;
    }

    data.forEach(async (entry) => {
      const { user_id, guild_id, created_at } = entry;
      const lockedDuration = Date.now() - new Date(created_at).getTime();

      if (lockedDuration > 45 * 60 * 1000) {
        // Restore roles
        const member = await client.guilds.cache.get(guild_id).members.fetch(user_id);
        if (member) {
          await member.roles.remove(process.env.TEMP_ROLE_ID);
          await member.roles.add(process.env.RM_ROLE_ID);
        }

        // Remove from locked_admins
        await supabase.from('locked_admins').delete().eq('id', entry.id);
      }
    });
  });
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

    // Emoji reaction on keyword
    if(secretWord) {
      if (message.content.toLowerCase().includes('penis')) {
          try {
              await message.react('<:word_of_the_week:1470196970470641787>');// custom emoji ID
              console.log(`${message.author.username} triggered word of the week reaction.`);
              secretWord = false; // reset secret word
          } catch (error) {
              console.log(`Failed to react with emoji: ${error}`);
          }
      }
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
    console.log(`Command \`${interaction.commandName}\` executed`);
  } catch (error) {
    console.log(error);
    await interaction.channel.send({ content: 'There was an error executing that command!', ephemeral: true });
  }
});

client.on('guildMemberRemove', async member => {
    if (process.env.BETA == 1) return;

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
        console.log('Error fetching audit logs for kick detection:', err);
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
