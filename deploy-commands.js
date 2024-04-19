{}(async () => {
	////////// Récupération des informations pour chaque fichiers //////////
	const fs = require('node:fs');

	console.log('Scanning files ...')
	const commands = []
	const CommandsPerm = []
	const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'))
	for (let file of commandFiles) {
		let command = require(`./commands/${file}`)
		commands.push(command.data.toJSON())
		// ⚠️ Ajouter a tout les fichiers le perm : {default perm}
		CommandsPerm.push({name : command.data.name,perm : command.perm })
	}
	console.log('Files scanned')

    ////////// Ajout des commands dans l'intégration du bot //////////
	const { CLIENT_ID, DEV_GUILD, token } = require('./config.json')
	const { REST, Routes } = require('discord.js')

	const rest = new REST({ version: '10' }).setToken(token)
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`)
		const data = await rest.put(
			// Uniquement lors du développement du bot
			Routes.applicationGuildCommands(CLIENT_ID,"1064990771926798446"),
			// A mettre lors de la publication du bot
			//Routes.applicationCommands(CLIENT_ID),
			{ body: commands }
		);
		console.log(`Successfully reloaded ${data.length} application (/) commands.`)
	} catch (error) {console.error(error)}
})()
