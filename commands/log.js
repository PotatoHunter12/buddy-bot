const fetchMessageCounts = require('../utils/fetchMessageCounts');
const { EmbedBuilder, ChannelType } = require('discord.js');
const supabase = require('../utils/supabaseClient');

module.exports = {
  name: 'log',
  description: 'Count messages per user in every channel on this server',
  async execute(interaction) {
    await interaction.reply('Counting messages, please wait...');
    const guild = interaction.guild;
    const channels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
    const output_channel = guild.channels.cache.get("1398262894638010388")
    const result = [];

    for (const channel of channels.values()) {
      const t = Date.now();
      const counts = await fetchMessageCounts(channel);

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
          .from('user_counts')
          .upsert(rows, { onConflict: ['guild_id', 'channel_id', 'user_id'] });

        if (error) {
          console.error(`Supabase error for #${channel.name}:`, error);
        } else {
          console.log(`Log command executed in ${guild.name} for channel #${channel.name}: ` + (Date.now() - t) + "ms");
        }
      }
    }

    const { data, error } = await supabase
      .from('user_counts')
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
      .setTitle(`Total Message Counts in ${guild.name}`)
      .setDescription(
        sorted.length > 0
          ? sorted.join('\n')
          : 'No user messages found in this server.'
      )
      .setColor(0x5865F2)
      .setTimestamp();

    await output_channel.send({ content: null, embeds: [embed] });

    const { data: channelData, error: channelError } = await supabase
    .from('user_counts')
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
      .setTitle(`Total Message Counts per Channel in ${guild.name}`)
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

    const totalEmbed = new EmbedBuilder()
      .setTitle(`Total Messages in ${guild.name}`)
      .setDescription(`**${totalMessages}** messages in this server.`)
      .setColor(0xFEE75C)
      .setTimestamp();

    await output_channel.send({ content: null, embeds: [totalEmbed] });
  },
};