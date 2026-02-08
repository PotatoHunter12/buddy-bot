const fetchWeeklyCounts = require('./fetchWeeklyCounts'); 
const { EmbedBuilder, ChannelType } = require('discord.js');
const supabase = require('./supabaseClient');
const QuickChart = require('quickchart-js');
let threadsg;

async function createChartEmbed(graphData){
    const chart = new QuickChart()
      .setConfig({
        type: 'bar',
        data: { 
          labels: ['Mon', 'Tue', 'Wed','Thu', 'Fri','Sat','Sun'], 
          datasets: [{ 
            backgroundColor: '#008cffff',
            borderColor: '#008cffff', 
            data: graphData, 
          }] 
        },
        options: {
          scales: {
            xAxes: [{
              ticks: {
                fontColor: '#ffffff'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.2)'
              }
            }],
            yAxes: [{
              ticks: {
                beginAtZero: true,
                fontColor: '#ffffff'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.2)'
              }
            }]
          },
          title: {
            display: true,
            text: 'Daily Message Counts',
            fontSize: 24,
            fontColor: '#ffffff'
          },
          legend: {
              display: false 
          },
        }
      })
      .setWidth(800)
      .setHeight(400)
      .setBackgroundColor('#1a1a1a');
    const chartUrl = await chart.getUrl();

    // Send the chart image
    return new EmbedBuilder()
      .setTitle(`Weekly Message Count Chart`)
      .setImage(chartUrl)
      .setColor(0x00B0F4)
      .setTimestamp();

}
async function createSummaryEmbed(userTotals, channelTotals) {
    const totalMessages = Object.values(userTotals).reduce((sum, count) => sum + count, 0);

    // Get top 3 users
    const topUsers = Object.entries(userTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([userId, count], idx) => {
        const medal = ['🥇', '🥈', '🥉'][idx] || '';
        return `${medal} <@${userId}>: ${count}`;
    });

    // Get top 1 channel
    const [topChannelId, topChannelCount] = Object.entries(channelTotals)
      .sort((a, b) => b[1] - a[1])[0] || [null, null];

  return new EmbedBuilder()
    .setTitle(`This Week's Server Activity Summary`)
    .addFields(
    {
        name: 'Top 3 Users',
        value: topUsers.length > 0 ? topUsers.join('\n') : 'No active users this week.',
        inline: false,
    },
    {
        name: 'Most Active Channel',
        value: topChannelId ? `<#${topChannelId}>: ${topChannelCount} messages` : 'No active channels this week.',
        inline: false,
    },
    {
        name: 'Total Messages',
        value: `**${totalMessages}** messages this week.`,
        inline: false,
    })
    .setColor(0x00B0F4)
    .setTimestamp();
}
async function createReactEmbed(urgTotals, urrTotals) {
  const topReacter = Object.entries(urgTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([userId, count], idx) => {
      const medal = ['🥇', '🥈', '🥉'][idx] || '';
      return `${medal} <@${userId}>: ${count}`;
    });

  const topReacted = Object.entries(urrTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([userId, count], idx) => {
      const medal = ['🥇', '🥈', '🥉'][idx] || '';
      return `${medal} <@${userId}>: ${count}`;
    });

  const totalReacts = Object.values(urgTotals).reduce((sum, count) => sum + count, 0);

  return new EmbedBuilder()
    .setTitle(`This Week's Server Reactions Summary`)
    .addFields(
    {
        name: 'Top 3 Most Reactive Users',
        value: topReacter.length > 0 ? topReacter.join('\n') : 'No active users this week.',
        inline: false,
    },
    {
        name: 'Top 3 Most Reacted Users',
        value: topReacted.length > 0 ? topReacted.join('\n') : 'No reactions given this week.',
        inline: false,
    },
    {
      name: 'Total Reactions',
      value: `**${totalReacts}** reactions this week.`,
      inline: false,
    })
    .setColor(0x00B0F4)
    .setTimestamp();
}
async function createChannelEmbed(channelTotals, guild) {
  const sortedChannels = Object.entries(channelTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([channelId, count], i) => `${i + 1}. <#${channelId}>: ${count}`);

  return new EmbedBuilder()
    .setTitle(`This Week's Activity per Channel in ${guild.name}`)
    .setDescription(
      sortedChannels.length > 0
        ? sortedChannels.join('\n')
        : 'No messages found in any channel.'
    )
    .setColor(0x57F287)
    .setTimestamp();
}
async function createUserEmbed(userTotals, guild) {
   const sorted = Object.entries(userTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([userId, count], i) => `${i + 1}. <@${userId}>: ${userId == "266974622887444480" ? count + 200 : count}`);

    return new EmbedBuilder()
      .setTitle(`This Week's Message Counts in ${guild.name}`)
      .setDescription(
        sorted.length > 0
          ? sorted.join('\n')
          : 'No user messages found in this server.'
      )
      .setColor(0x5865F2)
      .setTimestamp();
}
async function recount(guild) {
  const { error: deleteError } = await supabase
    .from('user_counts_week')
    .delete()
    .eq('guild_id', guild.id);

  if (deleteError) {
    console.log('Failed to clear user_counts_week table:', deleteError);
    return;
  }

  const channels = guild.channels.cache.filter(
    c => c.type === ChannelType.GuildText
    && c.parentId !== '932752870820946000' // exclude arhiv
    && c.parentId !== '1007666543850692708' // exclude admin channels
  );
  const allDailyCounts = {};

  for (const channel of channels.values()) {
    const t = Date.now();
    const {
      counts, 
      daily, 
      reactionTotals, 
      reactionGiven, 
      reactionReceived,
      threads
    } = await fetchWeeklyCounts(channel);

    threadsg = {...threadsg, ...threads};

    for (const [day, count] of Object.entries(daily)) {
      allDailyCounts[day] = (allDailyCounts[day] || 0) + count;
    }

    for (const user of Object.keys(reactionGiven)) {
      if (!counts[user]) counts[user] = 0;
    }

    const rows = Object.entries(counts)
      .map(([userId, count]) => ({
        guild_id: guild.id,
        channel_id: channel.id,
        user_id: userId,
        msg_count: count,
        react_given: reactionGiven[userId] || 0,
        react_received: reactionReceived[userId] || 0,
        updated_at: new Date().toISOString(),
      }));

    if (rows.length > 0) {
      const { error } = await supabase
        .from('user_counts_week')
        .upsert(rows, { onConflict: ['guild_id', 'channel_id', 'user_id'] });

      if (error) {
        console.log(`Supabase error for #${channel.name}:`, error);
      } else {
        console.log(`Log command executed in ${guild.name} for channel #${channel.name}: ` + (Date.now() - t) + "ms");
      }
    }
  }
  const sortedDays = Object.keys(allDailyCounts).sort();
  const graphData = sortedDays.map(day => allDailyCounts[day]);

  return graphData;

}

async function weeklyStats(client) {
  const guild = await client.guilds.fetch(process.env.BETA == 0 ? "508432432312352780" : "939531690899034132");
  const out_id = process.env.BETA == 0 ? "1398262894638010388" : "1049440127480496160";

  const output_channel = guild.channels.cache.get(out_id);

  const graphData = await recount(guild);

  const { data, error } = await supabase
    .from('user_counts_week')
    .select('user_id, channel_id, msg_count, react_given, react_received')
    .eq('guild_id', guild.id);
  if (error) {
    console.log('Supabase fetch error:', error);
    await interaction.editReply('Failed to fetch message counts from the database.');
    return;
  }

  const userTotals = {};
  const urgTotal = {};
  const urrTotal = {};
  const channelTotals = {};
  
  for (const row of data) {
    userTotals[row.user_id] = (userTotals[row.user_id] || 0) + row.msg_count;
    urgTotal[row.user_id] = (urgTotal[row.user_id] || 0) + row.react_given;
    urrTotal[row.user_id] = (urrTotal[row.user_id] || 0) + row.react_received;

    channelTotals[row.channel_id] = (channelTotals[row.channel_id] || 0) + row.msg_count;
  }

  const userEmbed = await createUserEmbed(userTotals, guild);
  const channelEmbed = await createChannelEmbed(channelTotals, guild);
  const summaryEmbed = await createSummaryEmbed(userTotals, channelTotals);
  const reactEmbed = await createReactEmbed(urgTotal, urrTotal);
  const chartEmbed = await createChartEmbed(graphData);

  await output_channel.send({ content: null, embeds: [userEmbed] });
  await output_channel.send({ content: null, embeds: [channelEmbed] });
  await output_channel.send({ content: null, embeds: [summaryEmbed] });
  await output_channel.send({ content: null, embeds: [reactEmbed] });
  await output_channel.send({ content: null, embeds: [chartEmbed] });
  const embed = new EmbedBuilder()
      .setTitle('Secret Word of the Week was `ratecards`!')
      .setDescription('<@266974622887444480> guessed the word <zozparty:1466446491697807495>')
      .setColor(0x00FF00)
      .setTimestamp();
  await output_channel.send({ embeds: [embed] });
  console.log('Sent secret word of the week embed');

};

module.exports = weeklyStats;
