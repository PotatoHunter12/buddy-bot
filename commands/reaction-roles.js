const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'reaction-roles',
  description: 'Create a message with reaction roles',
  async execute(interaction) {
    const emojis = interaction.options.getString('emotes').split(',').map(e => e.trim());
    const roles = interaction.options.getString('roles').split(',').map(r => r.trim());
    const msgText = interaction.options.getString('message');

    if (emojis.length !== roles.length) {
      await interaction.reply({ content: 'Number of emojis and roles must match.', ephemeral: true });
      return;
    }

    const roleIDs = roles.map(r => {
      const match = r.match(/^<@&(\d+)>$/);
      return match ? match[1] : r;
    });

    const roleNames = roleIDs.map(roleId => {
        const role = interaction.guild.roles.cache.get(roleId);
        return role ? role.name : `Unknown (${roleId})`;
    });
    const emojiRoleList = emojis.map((emoji, i) => `${emoji}: ${roleNames[i]}`).join('   ');

    const embed = new EmbedBuilder()
      .setTitle('Pick your roles!')
      .setDescription(`${msgText}\n\n**Reaction Roles:**\n${emojiRoleList}`)
      .setColor(0x5865F2);

    const sentMsg = await interaction.channel.send({ embeds: [embed] });
    await interaction.reply({ content: 'Reaction roles message sent!', ephemeral: true });

    // Add reactions
    for (const emoji of emojis) {
      await sentMsg.react(emoji);
    }

    const mapping = {};
    emojis.forEach((emoji, i) => {
      const match = emoji.match(/^<a?:\w+:(\d+)>$/);
      const key = match ? `${emoji.split(':')[1].replace('>','')}` : emoji; // keep same canonical key
      // better: use emoji.id or emoji.name stored as mapping keys (see manager's lookup)
      if (match) {
        // store by id-key "name:id"
        const name = emoji.match(/^<a?:([^:>]+):/)[1];
        mapping[`${name}:${match[1]}`] = roleIDs[i];
      } else {
        mapping[emoji] = roleIDs[i];
      }
    });

    // persist mapping and register it in memory via manager
    if (interaction.client.reactionRoles) {
      await interaction.client.reactionRoles.register(sentMsg.id, interaction.guild.id, interaction.channel.id, mapping);
    } else {
      // fallback: insert directly to DB if manager not initialized
      const supabase = require('../utils/supabaseClient');
      await supabase.from('reaction_roles').upsert([{ guild_id: interaction.guild.id, channel_id: interaction.channel.id, message_id: sentMsg.id, mapping }]);
      // still set local map so runtime works until next restart
      interaction.client.reactionRoleMap = interaction.client.reactionRoleMap || new Map();
      interaction.client.reactionRoleMap.set(sentMsg.id, mapping);
    }
  },
};