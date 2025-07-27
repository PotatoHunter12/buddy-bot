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

    // Store mapping for this message
    const reactionRoleMap = {};
    emojis.forEach((emoji, i) => {
        // Parse custom emote id
        const match = emoji.match(/^<a?:\w+:(\d+)>$/);
        reactionRoleMap[match ? match[1] : emoji] = roleIDs[i];
    });

    // Reaction add
    const onReactAdd = async (reaction, user) => {
        console.log(`Reaction added: ${reaction.emoji.name} by ${user.tag}`);
            
        if (reaction.message.id !== sentMsg.id) return;
        if (user.bot) return;
        const roleId = reactionRoleMap[reaction.emoji.id] || reactionRoleMap[reaction.emoji.name];
        if (!roleId) return;
        const member = await reaction.message.guild.members.fetch(user.id);
        await member.roles.add(roleId);
    };

    // Reaction remove
    const onReactRemove = async (reaction, user) => {
        console.log(`Reaction removed: ${reaction.emoji.name} by ${user.tag}`);
        if (reaction.message.id !== sentMsg.id) return;
        if (user.bot) return;
        const roleId = reactionRoleMap[reaction.emoji.id] || reactionRoleMap[reaction.emoji.name];
        if (!roleId) return;
        const member = await reaction.message.guild.members.fetch(user.id);
        await member.roles.remove(roleId);
    };

    const client = interaction.client;
    client.on('messageReactionAdd', onReactAdd);
    client.on('messageReactionRemove', onReactRemove);

  },
};