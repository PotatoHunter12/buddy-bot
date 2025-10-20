const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const supabase = require('../utils/supabaseClient');

module.exports = {
    name: 'diploma',
    description: 'Lock in fr',
    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
        }

        const botMember = interaction.guild.members.me;
        const invoker = interaction.member;
        const durationMs = 45 * 60 * 1000; // 45 minutes

        // Prevent timing out the server owner or the bot itself
        if (invoker.id === interaction.guild.ownerId) {
            return interaction.reply({ content: 'I cannot timeout the server owner.', ephemeral: true });
        }
        if (invoker.id === botMember.id) {
            return interaction.reply({ content: 'I will not timeout myself.', ephemeral: true });
        }

        const adminRoleId = process.env.RM_ROLE_ID;
        const tempRoleId = process.env.TEMP_ROLE_ID;

        try {
            if (invoker.roles.cache.has(adminRoleId)) {
                try {
                    await invoker.roles.remove(adminRoleId, 'Remove admin role before timeout');
                    await invoker.roles.add(tempRoleId, 'Add temporary role during timeout');

                    try {
                        const { error } = await supabase
                            .from('locked_admins')
                            .insert([{
                                guild_id: interaction.guild.id,
                                user_id: invoker.id,
                            }]);
                        if (error) {
                            console.error('Failed to save role timeout to Supabase:', error);
                        }
                    } catch (dbErr) {
                        console.error('Supabase insert error:', dbErr);
                    }

                } catch (err) {
                    console.error('Failed to remove admin role:', err);
                    await interaction.followUp({ content: 'Failed to remove admin role before timing out. Ensure I have Manage Roles permission.', ephemeral: true });
                    return;
                }
            }
            // Attempt timeout
            await invoker.timeout(durationMs, 'Requested by diploma command');
            await interaction.reply({ content: 'Locked in for 45 minutes...', ephemeral: true });
            // If you want a public confirmation, you could follow up here (non-ephemeral).
        } catch (err) {
            console.error('Failed to timeout member:', err);
            // Provide a short, useful error to the invoker
            return interaction.followUp({
                content: 'Unable to timeout you. Ensure my role is above yours and I have the Moderate Members permission.',
                ephemeral: true
            });
        }
    }
};