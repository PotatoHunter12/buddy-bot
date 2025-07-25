const fetchWeeklyCounts = require('../utils/fetchWeeklyCounts');
const { EmbedBuilder, ChannelType } = require('discord.js');
const supabase = require('../utils/supabaseClient');

module.exports = {
  name: 'log-weekly',
  description: 'Count messages per user in every channel on this server this week',
  async execute(interaction) {
    await interaction.reply('Counting messages, please wait...');
    const guild = interaction.guild;
    const channels = guild.channels.cache.filter(
      c => c.type === ChannelType.GuildText
      && c.parentId !== '932752870820946000' // exclude arhiv
      && c.parentId !== '1007666543850692708' // exclude admin channels
    );
    const out_id = process.env.BETA == 0 ? "1398262894638010388" : "1049440127480496160";
    const output_channel = guild.channels.cache.get(out_id);

    for (const channel of channels.values()) {
      const t = Date.now();
      const counts = await fetchWeeklyCounts(channel);

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

    const { data, error } = await supabase
      .from('user_counts_week')
      .select('user_id, msg_count')
      .eq('guild_id', guild.id);

    if (error) {
      console.error('Supabase fetch error:', error);
      await interaction.editReply('Failed to fetch message counts from the database.');
      return;
    }

    const userTotals = {};
    for (const row of data) {
      userTotals[row.user_id] = (userTotals[row.user_id] || 0) + row.msg_count;
    }

    const sorted = Object.entries(userTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([userId, count]) => `<@${userId}>: ${count}`);

    const embed = new EmbedBuilder()
      .setTitle(`This Week's Message Counts in ${guild.name}`)
      .setDescription(
        sorted.length > 0
          ? sorted.join('\n')
          : 'No user messages found in this server.'
      )
      .setColor(0x5865F2)
      .setTimestamp();

    await output_channel.send({ content: null, embeds: [embed] });

    const { data: channelData, error: channelError } = await supabase
    .from('user_counts_week')
    .select('channel_id, msg_count')
    .eq('guild_id', guild.id);

    if (channelError) {
      console.error('Supabase fetch error (channels):', channelError);
      await output_channel.send('Failed to fetch channel message counts from the database.');
      return;
    }

    // Aggregate totals per channel
    const channelTotals = {};
    for (const row of channelData) {
      channelTotals[row.channel_id] = (channelTotals[row.channel_id] || 0) + row.msg_count;
    }

    // Sort and format
    const sortedChannels = Object.entries(channelTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([channelId, count]) => `<#${channelId}>: ${count}`);

    const channelEmbed = new EmbedBuilder()
      .setTitle(`This Week's Activity per Channel in ${guild.name}`)
      .setDescription(
        sortedChannels.length > 0
          ? sortedChannels.join('\n')
          : 'No messages found in any channel.'
      )
      .setColor(0x57F287)
      .setTimestamp();

    await output_channel.send({ content: null, embeds: [channelEmbed] });

    // Calculate total number of messages in the server
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

    const summaryEmbed = new EmbedBuilder()
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

    await output_channel.send({ content: null, embeds: [summaryEmbed] });
  },
};