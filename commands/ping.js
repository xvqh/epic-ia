const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    async execute(client, interaction, table) {
        console.log(table)
        let u = await table.findOne({ where: { mot: "salut" } })
        await interaction.reply({ content: `Pong! :ping_pong:\n\nLatence: \`0 ms\`\nAPI: \`0 ms\``, allowedMentions: { repliedUser: false } }).then(m => {

            interaction.editReply({ content: `Pong! :ping_pong:\nAPI: \`${Math.round(interaction.client.ws.ping)} ms\``, allowedMentions: { repliedUser: false } })
        })
    },
};
