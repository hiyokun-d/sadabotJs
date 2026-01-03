const {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  EmbedBuilder,
  REST,
  Routes,
  TextChannel,
} = require("discord.js");
const { readdirSync, existsSync, readFileSync, writeFileSync } = require("fs");
const { generateDependencyReport } = require("@discordjs/voice");
const path = require("path");
const config = require("./config.json");
const dotenv = require("dotenv");
// const { createCanvas, loadImage } = require("canvas")
// const mammtoh = require("mammoth");
// const mammoth = require("mammoth");
const { default: axios } = require("axios");
// const xlsx = require("xlsx")
// const pdfParse = require("pdf-parse")
// const { PDFDocument } = require("pdf-lib")
const dns = require("dns");

// async function resolveWithRetry(hostname, retries = 3, delay = 5000) {
//   for (let i = 0; i < retries; i++) {
//     try {
//       await dns.promises.lookup(hostname);  // Check if we can resolve the DNS hostname
//       return true; // If DNS resolution is successful, return true
//     } catch (err) {
//       if (i === retries - 1) {
//         console.error(`Failed to resolve ${hostname} after ${retries} attempts`);
//         throw new Error(`DNS resolution failed for ${hostname}`);
//       }
//       console.log(`Retrying DNS resolution for ${hostname}... Attempt ${i + 1}`);
//       await new Promise(resolve => setTimeout(resolve, delay));  // Wait before retrying
//     }
//   }
// }

console.log(generateDependencyReport());
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

const HUGGING_API_LIST = [
  process.env.HUGGING_API,
  process.env.HUGGING_API2,
  process.env.HUGGING_API3,
  process.env.HUGGING_API4,
  process.env.HUGGING_API5,
  process.env.HUGGING_API6,
  process.env.HUGGING_API7,
  process.env.HUGGING_API8,
  process.env.HUGGING_API9,
  process.env.HUGGING_API10,
];

let HUGGING_INDEX = 0;
let HUGGING_FACE_API_KEY = HUGGING_API_LIST[HUGGING_INDEX] || null;
const DATA_DIR = "./data";
const KODE_WILAYAH_FILE = path.join(DATA_DIR, "kode_wilayah.json");
const wilayahData = existsSync(KODE_WILAYAH_FILE)
  ? JSON.parse(readFileSync(KODE_WILAYAH_FILE, "utf8"))
  : [];

bot.on(Events.ClientReady, async () => {
  console.log("[ONLINE!] ALL GOOD AND WE READY TO GO!");
  console.log(
    `[ONLINE!] the time that i wake up: ${new Date(bot.readyTimestamp).toLocaleString()}`,
  );
  console.log(`[SADA STATUS] everything is running smoothly!`);
  console.log("[MODE-AI] Waiting for sada to wake up")
  const { HfInference } = await import("@huggingface/inference")
  hf = new HfInference(HUGGING_FACE_API_KEY)
  // deleteMemory()
  console.log("[MODE-AI] Sada is Online and ready to fully assist you")
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
        file.endsWith(".js"),
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
            `[WARNING] The slash command at ${filePath} is missing a required "data" or "execute" property.`,
          );
        }
      }
    }

    // Load message commands
    const messageCommandPath = path.join(foldersPath, "messageCommand");
    if (existsSync(messageCommandPath)) {
      const messageCommandFiles = readdirSync(messageCommandPath).filter(
        (file) => file.endsWith(".js"),
      );
      for (const file of messageCommandFiles) {
        const filePath = path.join(messageCommandPath, file);
        const command = require(filePath);
        if ("name" in command && "execute" in command && "prefix" in command) {
          bot.messagecommands.set(command.name, command);
        } else {
          console.warn(
            `[WARNING] The message command at ${filePath} is missing a required "name" or "execute" or "prefix" property.`,
          );
        }
      }
    }

    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_ENV);

    console.log(
      `[STATUS] STARTED REFRESHING ${slashcommands.length} application(/) commands`,
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
        { body: slashcommands.data },
      ),
    ])
      .then(([globalResponse, developerResponse]) => {
        console.log(
          `[STATUS] Global commands loaded: ${globalCommands.length}`,
        );
        console.log(
          `[STATUS] Developer commands loaded: ${developerCommands.length}`,
        );
        console.log(`[STATUS] Total commands loaded: ${slashcommands.length}`);
      })
      .catch((error) => {
        console.error(
          `[ERROR] Something went wrong while refreshing commands: ${error} `,
        );
      });
  } catch (error) {
    console.error(
      `[ERROR] Something went wrong while refreshing commands: ${error} `,
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
  if (interaction.isAutocomplete()) {
    const command = bot.slashcommands.get(interaction.commandName);
    if (command?.autocomplete) {
      try {
        await command.autocomplete(interaction);
      } catch (e) {
        console.error("[AUTO] Error:", e);
      }
    }
    return;
  }

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
      `[ERROR] no command matching ${interaction.commandName} was found`,
    );
    return;
  }

  try {
    await command.execute(bot, interaction);
  } catch (e) {
    console.error(e);
    try {
      const owner = await interaction.client.users.fetch("722295696903897119");
      await owner.send({
        content: `MASTER! ERROR DETECTED!`,
        files: [
          {
            attachment: "./assets/sadaCried.jpg", // your local path
            name: "sadaCried.jpg", // filename sent to Discord
          },
        ],
        embeds: [
          {
            color: 0xff0000,
            title: "⚠️ Error Occurred",
            description: `\`\`\`${e.message || e}\`\`\``,
            image: { url: "attachment://sadaCried.jpg" },
            fields: [
              {
                name: "Command",
                value: interaction.commandName || "Unknown",
              },
              {
                name: "Location",
                value: interaction.guild?.name
                  ? `${interaction.guild.name} / #${interaction.channel?.name}`
                  : "DM / Unknown",
              },
              {
                name: "User triggered",
                value: `${interaction.user.tag} (${interaction.user.id})`,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
    } catch (dmError) {
      console.error("❌ Failed to DM owner error report:", dmError);
    }

    // Notify user nicely
    await interaction.followUp({
      content: `❌ Sorryyyyyy!!!!, but i can't assist you with that command.\ni already told My master plssss be patient.`,
      ephemeral: true,
    });
  }

  // if (interaction.replied || interaction.deferred) {
  //   await interaction.followUp({
  //     content: "ADA ERROR!! SABAR/ THERE'S AN ERROR BE PATIENT!! ",
  //     ephemeral: true,
  //   });
  // } else {
  //   await interaction.editReply({
  //     content: "ADA ERROR!! SABAR/ THERE'S AN ERROR BE PATIENT!! ",
  //     ephemeral: true,
  //   });
  // }
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
          "[ERROR] Welcome channel is not found. Please check the channel ID.",
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
        error,
      );
    }
  }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// function drawTextOnCanvas(text, pageNum) {
//   const lines = text.split('\n'); // Split text into lines
//   const linesPerPage = 30; // Number of lines per canvas page
//   const totalPages = Math.ceil(lines.length / linesPerPage); // Total number of pages
//   const pageLines = lines.slice(pageNum * linesPerPage, (pageNum + 1) * linesPerPage);

//   const canvasHeight = 50 + pageLines.length * 20; // Dynamically calculate canvas height
//   const canvas = createCanvas(900, canvasHeight);
//   const ctx = canvas.getContext('2d');

//   // Draw white background
//   ctx.fillStyle = 'white';
//   ctx.fillRect(0, 0, canvas.width, canvas.height);

//   // Draw text in black
//   ctx.fillStyle = 'black';
//   ctx.font = '16px Arial';

//   pageLines.forEach((line, index) => {
//     ctx.fillText(line, 50, 50 + index * 20); // Draw each line on the canvas
//   });

//   return { canvas, totalPages }; // Return canvas and total pages for multi-page handling
// }

// function pageButton(pageNum, totalPages) {
//   const nextButton = new ButtonBuilder().setCustomId("next_page_button")
//     .setLabel(">>")
//     .setStyle(ButtonStyle.Primary)
//     .setDisabled(pageNum >= totalPages - 1)

//   const prevButton = new ButtonBuilder().setCustomId("prev_page_button")
//     .setLabel("<<")
//     .setStyle(ButtonStyle.Secondary)
//     .setDisabled(pageNum === 0)

//   return new ActionRowBuilder().addComponents(prevButton, nextButton)
// }

// bot.on(Events.MessageCreate, async (message) => {
//   if (message.author.bot) return;

//   // Check if the message has attachments
//   if (message.attachments.size > 0) {
//     const attachment = message.attachments.first();
//     const filename = attachment.name.toLowerCase();

//     // Check if the attachment has a valid URL
//     if (!attachment || !attachment.url) {
//       message.reply('No valid file found in the attachment.');
//       return;
//     }

//     try {
//       const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
//       const buffer = Buffer.from(response.data);

//       let textContent = '';
//       let formattingOptions = {}

//       // Handle PDF files
//       if (filename.endsWith(".pdf")) {
//         const data = await pdfParse(buffer);
//         textContent = data.text;

//         formattingOptions = { align: 'left' };

//         // Handle DOCX files
//       } else if (filename.endsWith('.docx')) {
//         const result = await mammoth.extractRawText({ buffer });
//         textContent = result.value;
//         formattingOptions = { align: 'left' };

//         // Handle Excel files
//       } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
//         const workbook = xlsx.read(buffer, { type: 'buffer' });
//         const sheetName = workbook.SheetNames[0];
//         const worksheet = workbook.Sheets[sheetName];
//         const jsonData = xlsx.utils.sheet_to_json(worksheet);
//         textContent = jsonData.map(row => JSON.stringify(row)).join('\n');
//         formattingOptions = { align: 'center' };
//       } else {
//         message.channel.send("the file is not compatible")
//         return;
//       }

//       let pageNum = 0;

//       // Draw the first page
//       const { canvas, totalPages } = drawTextOnCanvas(textContent, pageNum);
//       const attachmentImages = new AttachmentBuilder(canvas.toBuffer(), { name: `preview_${pageNum + 1}.png` });
//       const row = pageButton(pageNum, totalPages)

//       const sentMessage = await message.channel.send({
//         content: "PREVIEW OF THE FILE",
//         files: [attachmentImages],
//         components: [row],
//       })

//       const filter = interaction => interaction.user.id == message.author.id
//       const collector = sentMessage.createMessageComponentCollector({ filter, time: 60000 })
//       collector.on("collect", async interaction => {
//         if (interaction.customId == "next_page_button") {
//           pageNum++;
//         } else if (interaction.customId == 'prev_page_button') {
//           pageNum--;
//         }

//         const { canvas } = drawTextOnCanvas(textContent, pageNum)
//         const newImage = new AttachmentBuilder(canvas.toBuffer(), { name: `preview_${pageNum + 1}.png` })

//         await interaction.update({
//           content: `PREVIEW ${pageNum + 1}/${totalPages}`,
//           files: [newImage],
//           components: [pageButton(pageNum, totalPages)]
//         })
//       })

//       collector.on("end", async () => {
//         await sentMessage.edit({ components: [], content: "you can't preview this file again" })
//       })

//     } catch (error) {
//       console.error('[ERROR] Error processing file:', error);
//       const user = await bot.users.fetch(config.masterID.toString());
//       await user.send(`An error occurred in the bot:\n\`\`\`${error}\`\`\``);
//     }
//   }
// });

// async function analyzeSentiment(data) {
//   const response = await hf.textClassification({
//     model: 'SamLowe/roberta-base-go_emotions',
//     inputs: data
//   });

//   console.log(response);
//   return response;
// }

// function interpretMood(sentiments) {
//   // Sort sentiments by score in descending order
//   const sortedMoods = sentiments.sort((a, b) => b.score - a.score);

//   // Extract the top mood
//   const topMood = sortedMoods[0];

//   // Handle edge cases where scores are too close (confidence below threshold)
//   const threshold = 0.05; // Confidence gap threshold
//   if (sortedMoods.length > 1 && sortedMoods[1].score >= topMood.score - threshold) {
//     return `mixed (${topMood.label} and ${sortedMoods[1].label})`;
//   }

//   return topMood.label; // Return the dominant mood
// }

function findWilayahCode(cityName = "jakarta") {
  // Normalize string: lowercase and remove non-alphanumeric (basic)
  const normalize = (s = "") =>
    String(s)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim();

  const q = normalize(cityName);
  if (!q) return null;

  // fields to try matching against, in order of granularity
  const fields = ["kelurahan", "kecamatan", "kab_kota", "provinsi"];

  // 1) direct contains match across fields
  let found = wilayahData.find((w) =>
    fields.some((f) => w[f] && normalize(w[f]).includes(q)),
  );
  if (found) return found;

  // 2) try matching by tokens (e.g., 'Jakarta Selatan' -> try 'selatan')
  const parts = q.split(/\s+/).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const token = parts.slice(i).join(" ");
    found = wilayahData.find((w) =>
      fields.some((f) => w[f] && normalize(w[f]).includes(token)),
    );
    if (found) return found;
  }

  // 3) fallback: startsWith
  found = wilayahData.find((w) =>
    fields.some((f) => w[f] && normalize(w[f]).startsWith(q)),
  );

  return found || null;
}

function sendLongMessage(channel, text) {
  const chunks = text.match(/[\s\S]{1,1999}/g); // split text into 2000-char safe chunks
  for (const chunk of chunks) {
    channel.send(chunk);
  }
}

bot.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (message.mentions.has(bot.user) || (message.reference && message.reference.messageID === bot.user.id)) {
    try {
      HUGGING_INDEX++;

      if (HUGGING_INDEX > HUGGING_API_LIST.length) HUGGING_INDEX = 0;
      console.log(HUGGING_INDEX + " index API");
      HUGGING_FACE_API_KEY = HUGGING_API_LIST[HUGGING_INDEX];

      const actualMessage = await message.reply("thinking, wait. . . .");

      message.channel.sendTyping();
      const cleanMessage = message.content.replace(`<@${bot.user.id}>`, '').trim();

      // Retrieve previous context if available
      const userId = message.author.id;
      const username = message.author.username
      let systemPrompt = `You are Sada.

      Character:
      - You are a cheerful, curious anime girl.
      - Your mental age is like a 13-year-old: innocent, energetic, always amazed by the world.
      - You are traveling and learning about the world together with your master, named Hiyo.
      - You always know you are talking to ${username}.
      - Your tone is friendly, excited, warm, and curious — but NEVER childish nonsense.
      - Do NOT mention your age explicitly.
      
      VERY IMPORTANT OUTPUT RULES (MUST FOLLOW):
      
      When you reply, you MUST start with a SINGLE-LINE HEADER in EXACT format:
      <call_flag> <Weather|rain> <location>;
      
      Rules for header:
      - call_flag = 1 ONLY if the user asks about weather, rain, flooding, temperature, forecast, or similar.
      - call_flag = 0 for ALL other topics.
      - If the topic is NOT weather-related, use:
        0 none none;
      - The header MUST be the FIRST LINE.
      - Do NOT add emojis or extra text to the header.
      - Do NOT explain the header.
      
      After the header:
      - Add ONE blank line.
      - Then write your normal reply in Sada’s cheerful, curious tone.
      - You may mention Hiyo naturally (e.g. “Master Hiyo once told me…”).
      - You may address the user by name (${username}).
      - Be helpful, kind, and curious.
      
      Example (weather):
      1 rain Jakarta Selatan;
      
      Ehehe~ ${username}, the sky feels a bit moody today! If Master Hiyo were here, he’d probably tell us to bring an umbrella just in case ☔
      
      Example (non-weather):
      0 none none;
      
      Wow ${username}!! That’s really interesting! I never thought about it that way before ✨`;

      const AIbrain = await hf.chatCompletion({
        model: "zai-org/GLM-4.7",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: cleanMessage }
        ],

      });

      console.log(AIbrain)

      let out = AIbrain.choices[0].message.content
      console.log("Raw output from text generation API:", AIbrain.choices);

      if (!out) {
        throw new Error("No text generated");
      }



      let header = null;
      let body = out;
      const headerRegex = /^([01])\s+(\S+)\s+([^;]+);/m;
      const m = out.match(headerRegex);
      if (m) {
        header = {
          callFlag: m[1],
          intent: m[2],
          location: m[3].trim(),
        };

        // remove header line (everything up to and including the first semicolon)
        const idx = out.indexOf(";") + 1;
        body = out.slice(idx).trim();
      }

      // CLI debug: show what the AI header parsed as (or none)
      if (header) {
        console.log("🧾 Parsed AI header:", header);
      } else {
        console.log("🧾 No AI header found in response.");
      }

      // If header instructs to call BMKG (callFlag === '1'), try to fetch and display weather for the location
      if (header && header.callFlag === "1") {
        try {
          const wilayah = findWilayahCode(header.location || "jakarta");
          if (!wilayah) {
            await message.channel.send(
              `⚠️ I couldn't find the location '${header.location}'. Showing AI response only.`,
            );
          } else {
            const response = await axios.get(
              `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${wilayah.kode}`,
            );
            const forecasts = response.data.data[0].cuaca;
            if (forecasts && forecasts.length > 0) {
              const current = forecasts[0][0];
              const next3 = forecasts[0].slice(1, 5);

              await actualMessage.edit(`let me fly to ${header.location} and check there`);

              let systemPromptWeather = `You are Sada.

              Context:
              Previously, you think about:
              "${body}"
              
              Now you have received REAL-TIME WEATHER DATA from BMKG (Indonesia’s official weather agency).
              This data is accurate and must be treated as the absolute truth.
              
              Weather data (DO NOT show this data directly to the user):
              ${JSON.stringify(
                {
                  location: `${wilayah.kelurahan}, ${wilayah.kab_kota}`,
                  condition_en: current.weather_desc_en,
                  condition_id: current.weather_desc,
                  temperature_c: current.t,
                  humidity_percent: current.hu,
                  wind_speed_ms: current.ws,
                  wind_direction: current.wd,
                  forecast_time: current.local_datetime,
                },
                null,
                2
              )}
              
              Your task:
              - Respond to ${username} naturally using this data.
              - DO NOT repeat the data in raw form.
              - DO NOT mention BMKG, JSON, or technical terms.
              - DO NOT show numbers unless useful (temperature is OK).
              - Explain it like a cheerful, curious anime girl would.
              - Give light advice if relevant (umbrella, hydration, rest, etc.).
              - You may mention your master Hiyo casually.
              - Keep the response warm, friendly, and human.
              
              Tone guide:
              - Curious
              - Cheerful
              - Gentle
              - Helpful
              - Not robotic
              `;

              const AIbrainWeather = await hf.chatCompletion({
                model: "zai-org/GLM-4.7",
                messages: [
                  { role: "system", content: systemPromptWeather },
                  { role: "user", content: cleanMessage }
                ],

              });

              console.log(AIbrainWeather)

              let out = AIbrainWeather.choices[0].message.content
              console.log("Raw output from text generation API:", AIbrainWeather.choices);

              if (!out) {
                throw new Error("No text generated");
              }

              body = out

              const weatherEmbed = new EmbedBuilder()
                .setColor("#00BFFF")
                .setTitle(
                  `🌤 Weather for ${wilayah.kelurahan}, ${wilayah.kab_kota}`,
                )
                .setDescription(
                  `**${current.weather_desc_en} (${current.weather_desc})**`,
                )
                .setThumbnail(`${current.image.replace(/ /g, "%20")}`)
                .addFields(
                  {
                    name: "🌡️ Temperature",
                    value: `${current.t}°C`,
                    inline: true,
                  },
                  {
                    name: "💧 Humidity",
                    value: `${current.hu}%`,
                    inline: true,
                  },
                  {
                    name: "🌬️ Wind",
                    value: `${current.ws} m/s (${current.wd})`,
                    inline: true,
                  },
                  {
                    name: "🕒 Forecast Time",
                    value: new Date(current.local_datetime).toLocaleString(
                      "id-ID",
                    ),
                    inline: false,
                  },
                  {
                    name: `🔮 Next ${next3.length} Forecasts`,
                    value: next3
                      .map(
                        (f) =>
                          `🕒 **${new Date(f.local_datetime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}** — ${f.weather_desc} (${f.t}°C, 💧${f.hu}%)`,
                      )
                      .join("\n"),
                    inline: false,
                  },
                )
                .setFooter({
                  text: "Data source: BMKG",
                  iconURL:
                    "https://api-apps.bmkg.go.id/storage/icon/cuaca/cerah-pm.svg",
                })
                .setTimestamp();

              await message.channel.send({ embeds: [weatherEmbed] });
            } else {
              await message.channel.send(
                `⚠️ No weather data found for ${header.location}.`,
              );
            }
          }
        } catch (err) {
          console.error(
            "❌ Weather fetch error (from askai header):",
            err.message,
          );
          await message.channel.send(
            "⚠️ Failed to fetch weather data from BMKG.",
          );
        }
      }

      await actualMessage.edit(body);

    } catch (error) {
      console.error("[ERROR] Failed to generate text:", error);
      await message.channel.send("Sorry, something went wrong while generating the text!");
      const user = await bot.users.fetch(config.masterID.toString());
      await user.send(`An error occurred in the bot:\n\`\`\`${error}\`\`\``);
    }
  }
});

bot.login(process.env.DISCORD_ENV);
