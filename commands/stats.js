const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'stats',
    description: 'Show personalized statistics',
    async execute(interaction) {
        // count messages, reactions, etc. for the user from supabase
        

        const embedTotal = new EmbedBuilder()
            .setTitle("Your Stats")
            .setDescription("Here are your personalized statistics:")
            .addFields(
                { name: 'Messages Sent', value: '150', inline: true },
                { name: 'Reactions Given', value: '75', inline: true },
                { name: 'Reactions Received', value: '200', inline: true }
            )
            .setColor(0x00AE86); 
        const embedWeek = new EmbedBuilder()
            .setTitle("This Week")
            .setDescription("Here are your statistics for the past week:")
            .addFields(
                { name: 'Messages Sent', value: '20', inline: true },
                { name: 'Reactions Given', value: '10', inline: true },
                { name: 'Reactions Received', value: '30', inline: true }
            )
            .setColor(0x00AE86);

        await interaction.reply({ embeds: [embedTotal, embedWeek]});

    }
}