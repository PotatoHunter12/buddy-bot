const supabase = require('./supabaseClient');

async function loadMappings() {
  const { data, error } = await supabase
    .from('reaction_roles')
    .select('*');
  if (error) {
    console.error('Failed to load reaction role mappings:', error);
    return [];
  }
  return data || [];
}

async function saveMapping(row) {
  // row = { guild_id, channel_id, message_id, mapping } (mapping is an object)
  const { data, error } = await supabase
    .from('reaction_roles')
    .upsert([row], { onConflict: 'message_id' });
  if (error) {
    console.error('Failed to save reaction role mapping:', error);
  }
  return data;
}

function emojiKeyFromReaction(reaction) {
  return reaction.emoji.id ? `${reaction.emoji.name}:${reaction.emoji.id}` : reaction.emoji.name;
}

module.exports = {
  async init(client) {
    client.reactionRoleMap = new Map();

    const rows = await loadMappings();
    for (const r of rows) {
      try {
        client.reactionRoleMap.set(r.message_id, r.mapping);
      } catch (err) {
        console.warn('Invalid mapping row', r, err);
      }
    }

    // single global handlers
    client.on('messageReactionAdd', async (reaction, user) => {
      try {
        if (user.bot) return;
        if (reaction.partial) await reaction.fetch();
        if (!reaction.message) return;
        const mapping = client.reactionRoleMap.get(reaction.message.id);
        if (!mapping) return;
        const key = emojiKeyFromReaction(reaction);
        const roleId = mapping[key] || mapping[reaction.emoji.name];
        if (!roleId) return;
        const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
        if (member) await member.roles.add(roleId, 'Reaction role add');
      } catch (err) {
        console.error('react add handler error', err);
      }
    });

    client.on('messageReactionRemove', async (reaction, user) => {
      try {
        if (user.bot) return;
        if (reaction.partial) await reaction.fetch();
        if (!reaction.message) return;
        const mapping = client.reactionRoleMap.get(reaction.message.id);
        if (!mapping) return;
        const key = emojiKeyFromReaction(reaction);
        const roleId = mapping[key] || mapping[reaction.emoji.name];
        if (!roleId) return;
        const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
        if (member) await member.roles.remove(roleId, 'Reaction role remove');
      } catch (err) {
        console.error('react remove handler error', err);
      }
    });

    // expose helpers on client
    client.reactionRoles = {
      async register(messageId, guildId, channelId, mapping) {
        client.reactionRoleMap.set(messageId, mapping);
        await saveMapping({ guild_id: guildId, channel_id: channelId, message_id: messageId, mapping });
      },
      async unregister(messageId) {
        client.reactionRoleMap.delete(messageId);
        await supabase.from('reaction_roles').delete().eq('message_id', messageId);
      }
    };

    console.log('reactionRolesManager initialized - loaded', client.reactionRoleMap.size, 'mappings');
  }
};