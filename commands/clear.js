module.exports = {
    name: 'clear',
    description: 'Delete messages in this channel',
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount') || 10;
        const user = interaction.options.getUser('user');
        const channel = interaction.channel;

        let toDelete = [];
        let lastId = null;
        let remaining = amount;

        while (remaining > 0) {
            const fetchOptions = { limit: 100 };
            if (lastId) fetchOptions.before = lastId;
            const messages = await channel.messages.fetch(fetchOptions);

            if (messages.size === 0) break;

            let batch;
            if (user) {
                batch = messages.filter(m => m.author.id === user.id);
            } else {
                batch = messages;
            }

            for (const msg of batch.values()) {
                if (toDelete.length < amount) {
                    toDelete.push(msg);
                }
            }

            lastId = messages.last().id;
            remaining = amount - toDelete.length;
            if (messages.size < 100) break;
        }

        console.log(`Preparing to delete ${toDelete.length} messages in #${channel.name}...`);
        if (toDelete.length === 0) {
            await interaction.reply({ content: 'No messages found to delete.', ephemeral: true });
            return;
        }
        
        let deleted = 0;
        if (user) {
            for (const msg of toDelete) {
                try {
                    await msg.delete();
                    deleted++;
                } catch (err) {
                    console.error('Failed to delete message:', err);
                }
            }
        } else {
            while (toDelete.length > 0) {
                const batch = toDelete.splice(0, 100);
                try {
                    const deletedMessages = await channel.bulkDelete(batch, true);
                    deleted += deletedMessages.size;
                } catch (err) {
                    console.error('Failed to delete message:', err);
                }
            }
        }
        const warning = deleted < amount ? `Messages older than 14 days cannot be bulk deleted.` : '';
        await interaction.reply({ content: `Deleted ${deleted} messages. ${warning}`, ephemeral: true });
    },
};