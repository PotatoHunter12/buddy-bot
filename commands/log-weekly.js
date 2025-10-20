const fetchWeeklyCounts = require('../utils/fetchWeeklyCounts');
const { EmbedBuilder, ChannelType } = require('discord.js');
const supabase = require('../utils/supabaseClient');
const QuickChart = require('quickchart-js');

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
async function createSumEmbed(userTotals, channelTotals) {
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
      .map(([userId, count], i) => `${i + 1}. <@${userId}>: ${count}`);

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
async function recount(guild, interaction) {
  const { error: deleteError } = await supabase
    .from('user_counts_week')
    .delete()
    .eq('guild_id', guild.id);

  if (deleteError) {
    console.error('Failed to clear user_counts_week table:', deleteError);
    await interaction.editReply('Failed to clear previous data from database.');
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
    const {counts, daily} = await fetchWeeklyCounts(channel);

    for (const [day, count] of Object.entries(daily)) {
      allDailyCounts[day] = (allDailyCounts[day] || 0) + count;
    }

    const rows = Object.entries(counts)
      .map(([userId, count]) => ({
        guild_id: guild.id,
        channel_id: channel.id,
        user_id: userId,
        msg_count: count,
        updated_at: new Date().toISOString(),
      }));

    if (rows.length > 0) {
      const { error } = await supabase
        .from('user_counts_week')
        .upsert(rows, { onConflict: ['guild_id', 'channel_id', 'user_id'] });

      if (error) {
        console.error(`Supabase error for #${channel.name}:`, error);
      } else {
        console.log(`Log command executed in ${guild.name} for channel #${channel.name}: ` + (Date.now() - t) + "ms");
      }
    }
  }
  const sortedDays = Object.keys(allDailyCounts).sort();
  const graphData = sortedDays.map(day => allDailyCounts[day]);

  return graphData;

}

module.exports = {
  name: 'log-weekly',
  description: 'Count messages per user in every channel on this server this week',
  async execute(interaction) {
    await interaction.reply({content: 'Counting messages, please wait...', ephemeral: true});
    const guild = interaction.guild;

    const out_id = process.env.BETA == 0 ? "1398262894638010388" : "1049440127480496160";
    const output_channel = guild.channels.cache.get(out_id);

    const graphData = await recount(guild, interaction);

    const { data, error } = await supabase
      .from('user_counts_week')
      .select('user_id, channel_id, msg_count')
      .eq('guild_id', guild.id);
    if (error) {
      console.error('Supabase fetch error:', error);
      await interaction.editReply('Failed to fetch message counts from the database.');
      return;
    }

    const userTotals = {};
    const channelTotals = {};
    
    for (const row of data) {
      userTotals[row.user_id] = (userTotals[row.user_id] || 0) + row.msg_count;
      channelTotals[row.channel_id] = (channelTotals[row.channel_id] || 0) + row.msg_count;
    }

    const userEmbed = await createUserEmbed(userTotals, guild);
    const channelEmbed = await createChannelEmbed(channelTotals, guild);
    const summaryEmbed = await createSumEmbed(userTotals, channelTotals);
    const chartEmbed = await createChartEmbed(graphData);

    await output_channel.send({ content: null, embeds: [userEmbed] });
    await output_channel.send({ content: null, embeds: [channelEmbed] });
    await output_channel.send({ content: null, embeds: [summaryEmbed] });
    await output_channel.send({ content: null, embeds: [chartEmbed] });

  },
};