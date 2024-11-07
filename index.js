const { Client, GatewayIntentBits, Collection, Events, EmbedBuilder, REST, Routes, TextChannel, AttachmentBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, Attachment, InteractionResponse } = require("discord.js");
const { readdirSync, existsSync } = require("fs");
const { joinVoiceChannel, getVoiceConnection, generateDependencyReport, createAudioPlayer, NoSubscriberBehavior, createAudioResource } = require("@discordjs/voice")
const path = require("path");
const config = require("./config.json");
const dotenv = require("dotenv");
const { createCanvas, loadImage } = require("canvas")
const mammtoh = require("mammoth");
const mammoth = require("mammoth");
const { default: axios } = require("axios");
const xlsx = require("xlsx")
const pdfParse = require("pdf-parse")
const { PDFDocument } = require("pdf-lib")

console.log(generateDependencyReport())
dotenv.config();

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

let hf;

bot.on(Events.ClientReady, async () => {
  console.log("[ONLINE!] ALL GOOD AND WE READY TO GO!");
  console.log(`[ONLINE!] the time that i wake up: ${new Date(bot.readyTimestamp).toLocaleString()}`);
  console.log("[MODE-AI] Waiting for sada to wake up")
  const { HfInference } = await import("@huggingface/inference")
  hf = new HfInference(process.env.HUGGING_API)
  console.log("[MODE-AI] Sada is Online and ready to fully assist you")
})

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
          bot.slashcommands.set(command.data.name.toLowerCase(), command);

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
      `[STATUS] STARTED REFRESHING ${slashcommands.length} application(/) commands`
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
          `[ERROR] Something went wrong while refreshing commands: ${error} `
        );
      });
  } catch (error) {
    console.error(
      `[ERROR] Something went wrong while refreshing commands: ${error} `
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
    console.error(`[ERROR] Command execution failed: ${error} `);
    message.reply("There was an error trying to execute that command!");

    // Send error details to a specific user via DM
    try {
      const user = await bot.users.fetch("722295696903897119");
      await user.send(`An error occurred in the bot: \n\`\`\`${error}\`\`\``);
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

function drawTextOnCanvas(text, pageNum) {
  const lines = text.split('\n'); // Split text into lines
  const linesPerPage = 30; // Number of lines per canvas page
  const totalPages = Math.ceil(lines.length / linesPerPage); // Total number of pages
  const pageLines = lines.slice(pageNum * linesPerPage, (pageNum + 1) * linesPerPage);

  const canvasHeight = 50 + pageLines.length * 20; // Dynamically calculate canvas height
  const canvas = createCanvas(900, canvasHeight);
  const ctx = canvas.getContext('2d');

  // Draw white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw text in black
  ctx.fillStyle = 'black';
  ctx.font = '16px Arial';

  pageLines.forEach((line, index) => {
    ctx.fillText(line, 50, 50 + index * 20); // Draw each line on the canvas
  });

  return { canvas, totalPages }; // Return canvas and total pages for multi-page handling
}


function pageButton(pageNum, totalPages) {
  const nextButton = new ButtonBuilder().setCustomId("next_page_button")
    .setLabel(">>")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(pageNum >= totalPages - 1)

  const prevButton = new ButtonBuilder().setCustomId("prev_page_button")
    .setLabel("<<")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(pageNum === 0)

  return new ActionRowBuilder().addComponents(prevButton, nextButton)
}

bot.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Check if the message has attachments
  if (message.attachments.size > 0) {
    const attachment = message.attachments.first();
    const filename = attachment.name.toLowerCase();

    // Check if the attachment has a valid URL
    if (!attachment || !attachment.url) {
      message.reply('No valid file found in the attachment.');
      return;
    }

    try {
      const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);

      let textContent = '';
      let formattingOptions = {}

      // Handle PDF files
      if (filename.endsWith(".pdf")) {
        const data = await pdfParse(buffer);
        textContent = data.text;

        formattingOptions = { align: 'left' };

        // Handle DOCX files
      } else if (filename.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ buffer });
        textContent = result.value;
        formattingOptions = { align: 'left' };

        // Handle Excel files
      } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(worksheet);
        textContent = jsonData.map(row => JSON.stringify(row)).join('\n');
        formattingOptions = { align: 'center' };
      } else {
        message.channel.send("the file is not compatible")
        return;
      }


      let pageNum = 0;

      // Draw the first page
      const { canvas, totalPages } = drawTextOnCanvas(textContent, pageNum);
      const attachmentImages = new AttachmentBuilder(canvas.toBuffer(), { name: `preview_${pageNum + 1}.png` });
      const row = pageButton(pageNum, totalPages)

      const sentMessage = await message.channel.send({
        content: "PREVIEW OF THE FILE",
        files: [attachmentImages],
        components: [row],
      })

      const filter = interaction => interaction.user.id == message.author.id
      const collector = sentMessage.createMessageComponentCollector({ filter, time: 60000 })
      collector.on("collect", async interaction => {
        if (interaction.customId == "next_page_button") {
          pageNum++;
        } else if (interaction.customId == 'prev_page_button') {
          pageNum--;
        }

        const { canvas } = drawTextOnCanvas(textContent, pageNum)
        const newImage = new AttachmentBuilder(canvas.toBuffer(), { name: `preview_${pageNum + 1}.png` })

        await interaction.update({
          content: `PREVIEW ${pageNum + 1}/${totalPages}`,
          files: [newImage],
          components: [pageButton(pageNum, totalPages)]
        })
      })

      collector.on("end", async () => {
        await sentMessage.edit({ components: [], content: "you can't preview this file again" })
      })

    } catch (error) {
      console.error('[ERROR] Error processing file:', error);
      const user = await bot.users.fetch(config.masterID.toString());
      await user.send(`An error occurred in the bot:\n\`\`\`${error}\`\`\``);
    }
  }
});

bot.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return; // Ignore bot messages
  if (message.author.id != config.masterID) return
  if (message.author.id != config.masterID && message.channel.type !== "dm") return
  if (message.mentions.has(bot.user) || (message.reference && message.reference.messageID === bot.user.id)) {
    try {
      const acutalMessage = await message.reply("thinking, wait. . . .")
      message.channel.sendTyping();
      let systemPrompt = "You are Sada, a cheerful and fun assistant. Your master is Hiyo. You use emojis to keep things fun, clean, and informative. You're a smart friend who takes care of people in need and always responds in a short, friendly way to responds this message: ";
      const cleanMessage = message.content.replace(`<@${bot.user.id}>`, '').trim();

      let input = `${systemPrompt} ${cleanMessage} `;

      let out = await hf.textGeneration({
        model: "HuggingFaceTB/SmolLM2-1.7B-Instruct",
        inputs: input,
        parameters: { max_new_tokens: 250, temperature: 0.9 }
      });

      const answer = out.generated_text.replace(input, "").trim();

      message.channel.sendTyping();


      if (answer)
        await acutalMessage.edit(answer)
      else acutalMessage.edit("kesalahan berpikir")
    } catch (error) {
      console.error("[ERROR] Failed to generate text:", error.response ? error.response.data : error.message);
      console.error("[ERROR] Failed to generate text:", error);
      message.channel.send("Sorry, something went wrong while generating the text!");
      const user = await bot.users.fetch(config.masterID.toString());
      await user.send(`An error occurred in the bot:\n\`\`\`${error}\`\`\``);
    }
  }
});

bot.login(process.env.DISCORD_ENV);
