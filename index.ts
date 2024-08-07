import {
	EmbedBuilder,
	Events,
	REST,
	Routes,
	TextChannel,
	Client,
	Collection,
	GatewayIntentBits,
} from "discord.js";
import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import * as config from "./config.json";

const bot = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
	],
});

bot.on(Events.ClientReady, () => {
	console.log("[ONLINE!] ALL GOOD AND WE READY TO GO!");
});

//* COMMAND HANDLER
const slashcommands = [];
bot.slashcommands = new Collection();
bot.messagecommands = new Collection();
bot.cooldowns = new Collection();

// GRAB ALL THE COMMAN FOLDERS
const foldersPath = path.join(__dirname, "commands");

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

			// slashcommands.push({
			//   global: !isDeveloperOnly ? command.data.toJSON() : undefined,
			//   developer: isDeveloperOnly ? command.data.toJSON() : undefined
			// });

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

	const messageCommandPath = path.join(foldersPath, "messageCommand");
	if (existsSync(messageCommandPath)) {
		const messageCommandFiles = readdirSync(messageCommandPath).filter((file) =>
			file.endsWith(".js")
		);

		for (const file of messageCommandFiles) {
			const filePath = path.join(messageCommandPath, file);
			const command = require(filePath);
			if ("name" in command && "execute" in command && "prefix" in command) {
				bot.messagecommands.set(command.name, command);
			} else {
				console.warn(
					`[WARNING] The message command at ${filePath} is missing a required "name" or "execute" or "prefix", property pls check it again`
				);
			}
		}
	}
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_ENV);

(async () => {
	try {
		console.log(
			`[PROGRESS] STARTED REFRESHING ${slashcommands.length} application (/) commands`
		);

		console.log(
			`[PROGRESS] STARTED REFRESHING ${slashcommands.length} application (/) commands`
		);

		const globalCommands = slashcommands.filter(
			(command) => command.visibleTo === "global"
		);

		const developerCommands = slashcommands.filter(
			(command) => command.visibleTo === "developer"
		);

    
		const developerResponse = await rest.put(
      Routes.applicationGuildCommands(config.clientID, config.testServerID),
			{ body: developerCommands.map((command) => command.data) }
		);
    
		console.log(
      `[COMPLETE!] Developer commands loaded: ${developerCommands.length}`
		);
    
    const globalResponse = await rest.put(
      Routes.applicationCommands(config.clientID),
      { body: globalCommands.map((command) => command.data) }
    );

    console.log(`[COMPLETE!] Global commands loaded: ${globalCommands.length}`);

		console.log(`[COMPLETE!] Total commands loaded: ${slashcommands.length}`);
	} catch (error) {
		console.error(`[ERROR] something went wrong while refreshing: ${error}`);
	}
})();

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

bot.login(process.env.DISCORD_ENV);
