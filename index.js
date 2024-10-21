const { Client, GatewayIntentBits, Collection, Events, EmbedBuilder, REST, Routes, TextChannel } = require("discord.js");
const { readdirSync, existsSync } = require("fs");
const path = require("path");
const config = require("./config.json");

const bot = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
	],
});

bot.login("NzgxNzcwNDc4MTUwNjE1MDYw.GptCRz.coeVm91ErtwrD8vgbSlvQFDKAEuJLCnvHPMIUg");

bot.on(Events.ClientReady, () => {
	console.log("[ONLINE!] ALL GOOD AND WE READY TO GO!");
});

//* COMMAND HANDLER
const slashcommands = [];
bot.slashcommands = new Collection();
bot.messagecommands = new Collection();
bot.cooldowns = new Collection();

// GRAB ALL THE COMMAND FOLDERS
const foldersPath = path.join(__dirname, "commands");

(async () => {
	try {
		const globalCommands = [];
		const developerCommands = [];

		// Load slash commands
		const slashCommandPath = path.join(foldersPath, "slashCommand");
		if (existsSync(slashCommandPath)) {
			const slashCommandFiles = readdirSync(slashCommandPath).filter((file) =>
				file.endsWith(".js")
			);
			for (const file of slashCommandFiles) {
				const filePath = path.join(slashCommandPath, file);
				const command = require(filePath);
				if ("data" in command && "execute" in command) {
					const isDeveloperOnly = command.developer_only || false;
					bot.slashcommands.set(command.data.name, command);

					slashcommands.push({
						data: command.data.toJSON(),
						visibleTo: isDeveloperOnly ? "developer" : "global",
					});
				} else {
					console.warn(
						`[WARNING] The slash command at ${filePath} is missing a required "data" or "execute" property.`
					);
				}
			}
		}

		// Load message commands
		const messageCommandPath = path.join(foldersPath, "messageCommand");
		if (existsSync(messageCommandPath)) {
			const messageCommandFiles = readdirSync(messageCommandPath).filter(
				(file) => file.endsWith(".js")
			);
			for (const file of messageCommandFiles) {
				const filePath = path.join(messageCommandPath, file);
				const command = require(filePath);
				if ("name" in command && "execute" in command && "prefix" in command) {
					bot.messagecommands.set(command.name, command);
				} else {
					console.warn(
						`[WARNING] The message command at ${filePath} is missing a required "name" or "execute" or "prefix" property.`
					);
				}
			}
		}

		const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_ENV);

		console.log(
			`[STATUS] STARTED REFRESHING ${slashcommands.length} application (/) commands`
		);

		// Separate commands into global and developer
		slashcommands.forEach((command) => {
			if (command.visibleTo === "global") {
				globalCommands.push(command.data);
			} else if (command.visibleTo === "developer") {
				developerCommands.push(command.data);
			}
		});

		// Batch update using Promise.all for efficiency
		await Promise.all([
			rest.put(Routes.applicationCommands(config.clientID), {
				body: globalCommands,
			}),
			rest.put(
				Routes.applicationGuildCommands(config.clientID, config.testServerID),
				{ body: slashcommands.data }
			),
		])
			.then(([globalResponse, developerResponse]) => {
				console.log(
					`[STATUS] Global commands loaded: ${globalCommands.length}`
				);
				console.log(
					`[STATUS] Developer commands loaded: ${developerCommands.length}`
				);
				console.log(`[STATUS] Total commands loaded: ${slashcommands.length}`);
			})
			.catch((error) => {
				console.error(
					`[ERROR] Something went wrong while refreshing commands: ${error}`
				);
			});
	} catch (error) {
		console.error(
			`[ERROR] Something went wrong while refreshing commands: ${error}`
		);
	}
})();

//*MESSAGE COMMAND HANDLER
bot.on(Events.MessageCreate, async (message) => {
	if (message.author.bot || message.author === bot.user) return;
	if (!message.guild) return;
	let args, commandName;
	if (message.content.startsWith(config.prefix)) {
		args = message.content.slice(config.prefix.length).trim().split(/ +/g);
		commandName = args.shift()?.toLowerCase();
	} else {
		commandName = message.content.split(/ +/g)[0].toLowerCase();
	}

	const command = bot.messagecommands.get(commandName);

	if (!command) return;
	try {
		// Execute the command
		if (!command.prefix && !message.content.startsWith(config.prefix)) {
			command.execute(bot, message, args);
		}
		if (command.prefix && message.content.startsWith(config.prefix)) {
			command.execute(bot, message, args);
		}
	} catch (error) {
		console.error(`[ERROR] Command execution failed: ${error}`);
		message.reply("There was an error trying to execute that command!");

		// Send error details to a specific user via DM
		try {
			const user = await bot.users.fetch("722295696903897119");
			await user.send(`An error occurred in the bot:\n\`\`\`${error}\`\`\``);
		} catch (dmError) {
			console.error(`[ERROR] Failed to send error DM: ${dmError}`);
		}
	}
});

//* SLASH COMMAND HANDLER
bot.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;
	const command = interaction.client.slashcommands.get(interaction.commandName);
	const { cooldowns } = interaction.client;

	if (!cooldowns.has(command.data.name)) {
		cooldowns.set(command.data.name, new Collection());
	}

	const now = Date.now();
	const timestamps = cooldowns.get(command.data.name);
	const defaultCooldownDuration = 2;
	const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;
	if (timestamps.has(interaction.user.id)) {
		const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

		if (now < expirationTime) {
			const expiredTimestamp = Math.round(expirationTime / 1000);
			return interaction.reply({
				content: `Sabar dikit, lu sedang cooldown sabar!! \`${command.data.name}\`. lu bakalan bisa pakai ini lagi <t:${expiredTimestamp}:R>.`,
				ephemeral: true,
			});
		}
	}

	timestamps.set(interaction.user.id, now);
	setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

	if (!command) {
		console.error(
			`[ERROR] no command matching ${interaction.commandName} was found`
		);
		return;
	}

	try {
		await command.execute(bot, interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({
				content: "ADA ERROR!! SABAR/ THERE'S AN ERROR BE PATIENT!! ",
				ephemeral: true,
			});
		} else {
			await interaction.reply({
				content: "ADA ERROR!! SABAR/ THERE'S AN ERROR BE PATIENT!! ",
				ephemeral: true,
			});
		}
	}
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

///* MEMBER JOIN & AUTOROLES
bot.on(Events.GuildMemberAdd, async (member) => {
	if (member.guild.id === config.mainServerID) {
		try {
			// member.guild.channels.cache.get(config.channelLog)
			const server = bot.guilds.cache.get(config.mainServerID);
			if (!server) {
				console.error("[ERROR] Main server is not found.");
				return;
			}

			const channel = server.channels.cache.get("1247434959451459654");
			if (!channel || !(channel instanceof TextChannel)) {
				console.error(
					"[ERROR] Welcome channel is not found. Please check the channel ID."
				);
				return;
			}

			await channel.send({
				embeds: [
					new EmbedBuilder()
						.setColor("#73fa95")
						.setTitle("JOINING")
						.setTimestamp(member.joinedTimestamp)
						.addFields({ name: "username", value: member.displayName })
						.setThumbnail(member.displayAvatarURL()),
				],
			});

			// console.log(member.displayAvatarURL(), member.avatarURL(), member.avatar)

			//////////////////////////////////////////////////////////////////////////////////////////////////
			//* AUTO ROLES
			setTimeout(async () => {
				try {
					if (member.roles.cache.size == 1) {
						const role = member.guild.roles.cache.get(config.mainServerRolesID);
						if (!role) return console.error(`[ERROR] the role is not found`);
						await member.roles.add(role);
					}
				} catch (error) {
					console.error(`[ERROR] the role id is undefined`);
				}
			}, 6000); /* 60000 */
			///////////////////////////////////////////////////////////////////////////////////////////////////
		} catch (error) {
			console.error(
				"[ERROR] channel log is not found, maybe we can try something: ",
				error
			);
		}
	}
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
