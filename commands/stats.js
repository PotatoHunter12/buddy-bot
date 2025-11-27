const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'stats',
    description: 'Show personalized statistics',
    async execute(interaction) {
        // count messages, reactions, etc. for the user from supabase
        

        const embed = new EmbedBuilder()
            .setTitle("Your Statistics")
            .setDescription("Here are your personalized statistics:")
            .addFields(
                { name: 'Messages Sent', value: '150', inline: true },
                { name: 'Reactions Given', value: '75', inline: true },
                { name: 'Reactions Received', value: '200', inline: true }
            )
            .setColor(0x00AE86);    
        await interaction.reply({ embeds: [embed]});

    }
}