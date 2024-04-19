const { SlashCommandBuilder } = require('discord.js');
const Discord = require("discord.js")
module.exports = {
    data: new SlashCommandBuilder()
        .setName('word')
        .setDescription('Cherche le mot')
        .addStringOption(option =>
            option.setName('mot')
                .setDescription('Mot à rechercher')
                .setRequired(true)),
    async execute(client, interaction, table, config) {
        const mot = interaction.options.getString('mot')
        let obj_mot = await table.findOne({ where: { mot: mot } })
        if (obj_mot) {
            let list_rep = obj_mot.dataValues.responses
            let check = list_rep.filter(resp => resp.response)
            let map = check.sort((a, b) => a.balue > b.value)

            let row = new Discord.ActionRowBuilder()
                .addComponents(
                    new Discord.StringSelectMenuBuilder()
                        .setCustomId('select')
                        .setPlaceholder('Liste des mots répondants à ' + mot)
                )
                console.log(config)
            let i0 = 0;
            let i1 = 10;
            let page = 1;
            let embed
            let dle
            let guilde = map
                .slice(0, 10)

            let button_next = new Discord.ButtonBuilder().setStyle(Discord.ButtonStyle.Primary).setCustomId('next').setEmoji("▶️")
            let button_back = new Discord.ButtonBuilder().setStyle(Discord.ButtonStyle.Primary).setCustomId('back').setEmoji("◀️")

            let button_row = new Discord.ActionRowBuilder().addComponents([button_back, button_next])

            interaction.reply(`Chargement en cours...`).then(mmm => {

                const filter = i => {
                    return mmm.id === interaction.id;
                };
                guilds()
                const collector = mmm.createMessageComponentCollector({
                    filter,
                    componentType: Discord.ComponentType.Button,
                    time: 150000
                })
                const collectorr = mmm.createMessageComponentCollector({
                    filter,
                    componentType: Discord.ComponentType.StringSelect,
                    time: 150000
                })
                collector.on("collect", async (i) => {

                    if (i.user.id !== interaction.member.id) return i.reply({ content: "Vous n'avez pas la permission !", ephemeral: true }).catch(() => { })
                    if (i.customId === 'return') {
                        return guilds()
                    }
                    if (i.customId === 'supprimer') {
                        if(config.perms.admins.users_id.includes(interaction.member.id)){
                        if (list_rep.length <= 1) {
                            await table.destroy({where:{mot:mot}})
                        } else {
                            let filtered = obj_mot.filter(a => a.response !== dle)
                            await table.update({ responses: filtered }, { where: { mot: mot } })
                        }
                    }
                        return guilds()

                    }

                    i.deferUpdate();
                    if (i.customId === 'back') {
                        i0 = i0 - 10;
                        i1 = i1 - 10;
                        page = page - 1;

                        if (i0 + 1 < 0) {
                            return
                        }
                        description = map
                            .slice(i0, i1)
                            .join("\n");

                        embed.setFooter({
                            text:
                                `Page - ${page}/${Math.round(map.length / 10 + 1)}`
                        })
                            .setDescription(description);
                        guilde = map.map(resp => `\`${resp.response}\` (${resp.value})`)
                            .slice(i0, i1)

                        row = new Discord.ActionRowBuilder()
                            .addComponents(
                                new Discord.StringSelectMenuBuilder()
                                    .setCustomId('select')
                                    .setPlaceholder('Liste des réponses')
                            )
                        for (let i in guilde) {
                            row.components[0].addOptions(
                                {
                                    label: `${map[i].response}`,
                                    description: `Modifier ${map[i].response}`,
                                    value: `${map[i].response}`
                                })
                        }
                        interaction.editReply({ embeds: [embed], components: [row, button_row] });
                    }

                    if (i.customId === 'next') {
                        i0 = i0 + 10;
                        i1 = i1 + 10;
                        page = page + 1;
                        //if (i1 > bot.guilds.cache.size + 10) {
                        //  return
                        //}
                        if (!i0 || !i1) {
                            return
                        }
                        description = map.slice(i0, i1)
                            .join("\n");

                        embed
                            .setFooter({
                                text:
                                    `Page - ${page}/${Math.round(map.length / 10 + 1)}`
                            })
                            .setDescription(description);

                        guilde = map
                            .map(resp => `\`${resp.response}\` (${resp.value})`)
                            .slice(i0, i1)

                        row = new Discord.ActionRowBuilder()
                            .addComponents(
                                new Discord.StringSelectMenuBuilder()
                                    .setCustomId('select')
                                    .setPlaceholder('Liste des réponses')
                            )
                        for (let i in guilde) {
                            row.components[0].addOptions(
                                {
                                    label: `${map[i].response}`,
                                    description: `Modifier ${map[i].response}`,
                                    value: `${map[i].response}`
                                })
                        }
                        interaction.editReply({ embeds: [embed], components: [button_row, row] });
                    }
                });

                collectorr.on('collect', async select => {
                    if (select.user.id !== interaction.member.id) return select.reply({ content: "Vous n'avez pas la permission !", ephemeral: true }).catch(() => { })
                    const value = select.values[0]
                    if (value) lookresponse(value)
                    select.deferUpdate()
                })
                collector.on("end", async () => {
                    return interaction.editReply({ content: "Expiré !", embeds: [], components: [] }).catch(() => { })
                })
            })



            function lookresponse(word) {
                let { response, value } = map.filter(mo => word == mo.response)[0]
                embed = new Discord.EmbedBuilder()
                    .setAuthor({ name: response })
                    .addFields([{ name: "Valeur:", value: `${value} `, inline: false }])
                let back = new Discord.ButtonBuilder().setStyle(Discord.ButtonStyle.Primary).setCustomId('return').setEmoji("↩️")
                let leave = new Discord.ButtonBuilder().setStyle(Discord.ButtonStyle.Danger).setCustomId('supprimer').setEmoji("🔴").setLabel(`Supprimer ${response}`)
                dle = response
                let buttons = new Discord.ActionRowBuilder().addComponents([back, leave])
                return interaction.editReply({ embeds: [embed], components: [buttons] }).catch(() => { })
            }




            async function guilds() {
                obj_mot = await table.findOne({ where: { mot: mot } })
                if(!obj_mot || obj_mot.length <1){
                    return interaction.editReply({content: ":x: Aucun mot trouvé", embeds: [], components: [], files: []})
                }
                list_rep = obj_mot.dataValues.responses
                check = list_rep.filter(resp => resp.response)
                map = check.sort((a, b) => a.balue > b.value)
    
                guilde = map
                    .slice(0, 10)
                let description = map
                    .map(resp => `\`${resp.response}\` (${resp.value})`)
                    .join("\n");


                row = new Discord.ActionRowBuilder()
                    .addComponents(
                        new Discord.StringSelectMenuBuilder()
                            .setCustomId('select')
                            .setPlaceholder('Liste des réponses')
                    )
                for (let i in guilde) {
                    row.components[0].addOptions(
                        {
                            label: `${map[i].response}`,
                            description: `Modifier ${map[i].response}`,
                            value: `${map[i].response}`
                        })
                }

                embed = new Discord.EmbedBuilder()
                    .setTitle(`Modifier le mot ${mot}`)
                    .setFooter({ text: `Page - ${page}/${Math.ceil(map.length / 10)}` })
                    .setDescription("```\n                                      ```\n" + description);

                await interaction.editReply({
                    content: "",
                    embeds: [embed],
                    components: [row, button_row],
                    allowedMentions: { repliedUser: false }, files: ["fido.jpg"]
                })
            }

        } else {
            await interaction.reply(':x: Aucun mot trouvé');
        }
    },
};
