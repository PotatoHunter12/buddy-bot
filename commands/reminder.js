function parseTime(input) {
    input = input.trim();
    const now = new Date();

    // Number only (minutes)
    if (/^\d+$/.test(input)) {
        return new Date(now.getTime() + parseInt(input) * 60 * 1000);
    }

    // Number + h/d
    if (/^(\d+)([hd])$/.test(input)) {
        const [, num, unit] = input.match(/^(\d+)([hd])$/);
        if (unit === 'h') return new Date(now.getTime() + parseInt(num) * 60 * 60 * 1000);
        if (unit === 'd') return new Date(now.getTime() + parseInt(num) * 24 * 60 * 60 * 1000);
    }

    // hh:mm
    if (/^(\d{1,2}):(\d{2})$/.test(input)) {
        const [, hour, minute] = input.match(/^(\d{1,2}):(\d{2})$/);
        const target = new Date(now);
        target.setHours(parseInt(hour), parseInt(minute), 0, 0);
        if (target < now) target.setDate(target.getDate() + 1); // tomorrow if past
        return target;
    }

    // hh:mm dd.mm.yyyy
    if (/^(\d{1,2}):(\d{2}) (\d{1,2})\.(\d{1,2})\.(\d{4})$/.test(input)) {
        const [, hour, minute, day, month, year] = input.match(/^(\d{1,2}):(\d{2}) (\d{1,2})\.(\d{1,2})\.(\d{4})$/);
        return new Date(year, month - 1, day, hour, minute, 0, 0);
    }

    return null;
}

module.exports = {
  name: 'reminder',
  description: 'Set a reminder for a specific time',
  async execute(interaction) {
    const timeInput = interaction.options.getString('time');
    const message = interaction.options.getString('message') || 'This is your reminder!';
    const dm = interaction.options.getBoolean('dm') ?? false;
    const targetDate = parseTime(timeInput);

    if (!targetDate || targetDate < new Date()) {
      await interaction.reply({ content: 'Invalid or past time format. Examples: 15, 2h, 1d, 16:45, 16:45 27.07.2025', ephemeral: true });
      return;
    }

    const ms = targetDate.getTime() - Date.now();
    await interaction.reply({ content: `⏰ Reminder set for <t:${Math.floor(targetDate.getTime()/1000)}:F>.`, ephemeral: true });

    setTimeout(async () => {
        if (dm) {
            try {
                await interaction.user.send(`⏰ Reminder: ${message}`);
            } catch (err) {
                await interaction.channel.send(`<@${interaction.user.id}> ⏰ Reminder: ${message}`);
            }
        } else {
            await interaction.channel.send(`⏰ <@${interaction.user.id}>: ${message}`);
        }
    }, ms);
  },
};