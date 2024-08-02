import { EmbedBuilder, Events, REST, Routes, TextChannel } from "discord.js";
import { Client, Collection, GatewayIntentBits } from "discord.js";
import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import * as config from "./config.json";
import { GoogleGenerativeAI } from "@google/generative-ai";

// GEMINI AI
const genAi = new GoogleGenerativeAI(process.env.GEMINI_API);
const model = genAi.getGenerativeModel({ model: "gemini-1.5-flash" })
// ---------

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
      bot.slashcommands.set(command.data.name, command);
      slashcommands.push(command.data.toJSON());
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

    const data: Array<any> = await rest.put(
      // Routes.applicationCommands(
      // 	config.clientID,
      // ),
      Routes.applicationGuildCommands(config.clientID, config.testServerID),
      { body: slashcommands }
    );
    console.log(
      `[COMPLETE!] SUCCESS RELOADED ${data.length} application (/) commands`
    );
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
    await command.execute(interaction);
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


bot.on(Events.MessageCreate, async (msg) => {
  if (msg.author.bot || msg.author === bot.user) return;
  // if (msg.author.id != '722295696903897119') return;
  let prefixTemp = "!s"

  if (!msg.content.startsWith(prefixTemp)) return;
  if (!msg.guild) return;

  const args = msg.content.slice(prefixTemp.length).trim().split(/ +/g)
  const commandName = args.shift()?.toLowerCase();

  if (commandName == "ada") {
    const prompt = args.join(" ");

    await msg.channel.sendTyping();

    try {
      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text();
      console.log(text)
      msg.channel.send(text)
    } catch (error) {
      console.error("[ERROR] Generating content: ", error);
      msg.channel.send("Sorry there a few problem i had call hiyo to fix it or just wait")
    }
  }

})

bot.login(process.env.DISCORD_ENV);
