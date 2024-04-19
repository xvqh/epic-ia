const Discord = require('discord.js');
const fs = require("fs");
const { Sequelize, DataTypes, Model } = require('sequelize')
const WebSocket = require('ws');
const path = require('node:path')
const colors = require('colors');
const config = require('./config.json')
const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost', dialect: 'sqlite',
    logging: false, storage: 'database_ai.sqlite'
})

class table extends Model { }
table.init({
    mot: {
        type: DataTypes.STRING, allowNull: false
    },
    responses: {
        type: DataTypes.JSON, allowNull: false
    }
}, { sequelize: sequelize, freezeTableName: true, modelName: 'table', timestamps: false })


const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
        Discord.GatewayIntentBits.GuildMembers,
    ]
})

client.on("ready", async () => {

    console.log(
        `Connected has ${client.user.tag} \n`.bgBlue.white
        + `Client Id: ${client.user.id} \n `.bgGreen.black
        + `Invite: https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=0 \n`.bgGreen.black
        + `Discord Version: ${Discord.version}`.bgCyan.black
    )
    client.user.setActivity("Répondre aux questions", { type: "PLAYING", url: "https://www.twitch.tv/coins" })

    setInterval(function () {
        client.user.setActivity("Répondre aux questions", { type: "PLAYING", url: "https://www.twitch.tv/coins" })
    }, 1 * 10000000);

    const socket = new WebSocket.Server({ port: 5000 });

    socket.on("error", error => {
      console.log(error);
    });

    socket.on("connection", ws => {
      ws.on("message", async data => {
       let {word, response, message} = JSON.parse(data)
       await verify(word, response, message)
      });
    });


})

sequelize.authenticate().then(
    sequelize.sync().catch(e => console.error(e))
).catch(e => console.error(e))


client.commands = new Discord.Collection()
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[ATTENTION] La commande ${filePath} n'a pas la propriété "data" ou "execute"`);
    }
}

var limit = {}
client.on("messageCreate", async (message) => {
    if (!message.content || message.author.id == client.user.id || message.author.bot || !message.channel) return

    if (limit[message.channel.id] == true) return

    let mot = `${message.content.split(" ")[0]}${message.content.split(" ")[1] ? ` ${message.content.split(" ")[1]}` : ""}`
    let filter = async m => m.author.id !== client.user.id && !m.author.bot && noprefix(m.content)

    let collector = message.channel.createMessageCollector({ filter, maxProcessed: 2, time: config.awaitmsg, errors: ['time', 'maxProcessed'] })
    limit[message.channel.id] = true;
    collector.on('collect', m => {
        verify(mot.toLowerCase().replace("-", ""), m.content.toLowerCase(), message)
    })
    collector.on('end', collected => {
        limit[message.channel.id] = false;
    });
})

client.on("guildCreate", async (guild) => {
    let logs_channel = client.channels.cache.get(config.logs_channel[0])
    if (logs_channel) logs_channel.send({ content: `Je viens d'être ajouté sur ${guild.name} (${guild.memberCount} membres)` }).catch(e => console.error(e))
})

client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) { console.error(`Aucune commande trouvé sous le nom : ${interaction.commandName}`); return }

        try {
            await command.execute(client, interaction, table, config);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: "Une erreur est survenue lors de l'éxécution de la commande", ephemeral: true });
        }
    } else {
        let customId = interaction.customId.split("-")
        let component = interaction.message.components[0]

        if (interaction.isButton()) {
            //mot = 1 et reponses = 2
            if (!hasrole(interaction.member, config.perms.mods.roles_id.concat(config.perms.admins.roles_id)) && !config.perms.mods.users_id.concat(config.perms.admins.users_id).includes(interaction.member.id)) return interaction.reply({ content: "👮 Vous n'avez pas la permission", ephemeral: true })
            if (customId[0] == 'edit' || customId[0] == 'add') {
                const modal = new Discord.ModalBuilder()
                    .setCustomId(`modal-${customId[0]}`)
                    .setTitle(`Modification du mot : ${customId[1]}`);
                const mot = new Discord.TextInputBuilder()
                    .setCustomId('mot')
                    .setLabel("Quel est le mot principal ?")
                    .setValue(`${customId[1]}`)
                    .setRequired(true)
                    .setStyle(Discord.TextInputStyle.Short);
                const reponse = new Discord.TextInputBuilder()
                    .setCustomId('response')
                    .setLabel("Quelle est la réponse au mot ci-dessus ?")
                    .setValue(`${customId[2]}`)
                    .setMaxLength(100)
                    .setRequired(true)
                    .setStyle(Discord.TextInputStyle.Short);
                const firstActionRow = new Discord.ActionRowBuilder().addComponents(mot);
                const secondActionRow = new Discord.ActionRowBuilder().addComponents(reponse);
                // Add inputs to the modal
                modal.addComponents(firstActionRow, secondActionRow)
                return await interaction.showModal(modal).catch(e => { })
            }


            interaction.deferUpdate().catch(e => { })
            let color = null
            if (customId[0] == "ignor" || customId[0] == 'valid') {
                if (customId[0] == "ignor") {
                    color = 0xd90000
                } else if (customId[0] == 'valid') {
                    color = 0x04d600
                    ajtmot(customId[1], customId[2])
                }

                component.components[0].data.disabled = true
                component.components[1].data.disabled = true
                component.components[2].data.disabled = true
                interaction.message.edit({ embeds: [newEmbed(customId[1], customId[2], interaction.member, color)], components: [component] })
            }
        } else if (interaction.isModalSubmit()) {
            const mot = interaction.fields.getTextInputValue('mot');
            const response = interaction.fields.getTextInputValue('response');
            if (customId[1] == "edit") {
                component.components[0].data.custom_id = `valid-${mot}-${response}`
                component.components[2].data.custom_id = `edit-${mot}-${response}`
                component.components[3].data.custom_id = `add-${mot}-${response}`
                interaction.message.edit({ embeds: [newEmbed(mot, response, interaction.member, null)], components: [component] })
                interaction.reply({ content: `:white_check_mark: L'embed a bien été modifié`, ephemeral: true })
            } else if (customId[1] == "add") {
                ajtmot(mot, response)
                interaction.reply({ content: `:white_check_mark: La réponse \`${response}\` a bien été ajouté au mot \`${mot}\``, ephemeral: true })
            }
        }
    }
})


client.login(config.token)

function verify(word, response, message) {
    if(response.length > 25) return
    const row = new Discord.ActionRowBuilder()
        .addComponents(
            new Discord.ButtonBuilder()
                .setCustomId(`valid-${word}-${response}`)
                .setLabel('Valider !')
                .setStyle(Discord.ButtonStyle.Success),
            new Discord.ButtonBuilder()
                .setCustomId(`ignor-${word}-${response}`)
                .setLabel('Ignorer !')
                .setStyle(Discord.ButtonStyle.Danger),
            new Discord.ButtonBuilder()
                .setCustomId(`edit-${word}-${response}`)
                .setLabel('Modifier la réponse')
                .setStyle(Discord.ButtonStyle.Primary),
            new Discord.ButtonBuilder()
                .setCustomId(`add-${word}-${response}`)
                .setLabel('Ajouter une réponse')
                .setStyle(Discord.ButtonStyle.Secondary)
        )
    let logs_channel = null
    let tentative = 0
    while (!logs_channel && tentative < 10) {
        let rdm = entierAleatoire(0, config.logs_channel.length - 1)
        logs_channel = client.channels.cache.get(config.logs_channel[rdm])
    }
    logs_channel.send({ embeds: [newEmbed(word, response, message.member, null, null)], components: [row], files: ["fido.jpg"] }).catch(e => console.error(e))
}


function entierAleatoire(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function hasrole(member, rolearray) {
    let result = false
    rolearray.forEach(element => {
        let r = member.guild.roles.cache.get(element)
        if (r) {
            if (member.roles.cache.has(r.id)) result = true
        }
    });
    return result

}

async function ajtmot(mot, reponse) {
    let obj_mot = await table.findOne({ where: { mot: mot } })
    if (obj_mot) {
        let list_rep = obj_mot.dataValues.responses
        let check = list_rep.filter(resp => resp.response)
        let map = check.map(resp => resp.response)
        let num = map.indexOf(reponse)
        if (check.length > 1 && list_rep[num]) {
            list_rep[num].value++
        } else {
            list_rep.push({ response: reponse, value: 1 })
        }
        await table.update({ responses: list_rep }, { where: { mot: mot } })
    } else {
        let list_rep = [{ response: reponse, value: 1 }]
        await table.create({
            mot: mot,
            responses: list_rep
        })
    }
}

function newEmbed(mot, reponse, member, color) {

    let embed = new Discord.EmbedBuilder()
        .setColor(color ?? '2F3136')
        .setTitle('Vérification Requise')
        .setDescription("\`\`\`\n                                                             \`\`\`")
        .addFields(
            { name: 'Mot :', value: `${mot}`, inline: true },
            { name: 'Réponse : ', value: `${reponse}`, inline: true }
        )
        .addFields({ name: '\u200b', value: "\`\`\`\n                                                             \`\`\`" })
        .setTimestamp()
        .setFooter({ text: member ? `↳ ${member.user.username}#${member.user.discriminator}` : "Aucune Vérification Faites" })
        if(member){
            embed.setAuthor({ name: `${member.user.tag}`, iconURL: member.displayAvatarURL({ dynamic: true }), url: 'https://discord.gg/WpPPgyYj9w' })
        }
    return embed
}
function noprefix(sentence) {
    let prefix = ['?', '!', '+', '.', '-', '&', '>', '<', '$', '^', ';', '§']
    let result = true
    for (let i = 0; i < prefix.length; i++) {
        if (sentence.startsWith(prefix[i])) {
            result = false
        }
    }
    return result
}

