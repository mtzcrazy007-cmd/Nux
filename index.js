const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`Bot online como ${client.user.tag}`);
});

const CANAL_PROIBIDO = "1497952527658782750";
const CARGO_IMUNE = "669228551001866259";
const TEMPO_CASTIGO = 7 * 24 * 60 * 60 * 1000;

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  if (message.content.toLowerCase() === "!nux") {
    return message.reply("Nux está online 🔥");
  }

  if (message.channel.id !== CANAL_PROIBIDO) return;
  if (message.member.roles.cache.has(CARGO_IMUNE)) return;

  try {
    await message.delete();

    await message.member.timeout(
      TEMPO_CASTIGO,
      "Enviou mensagem em canal proibido"
    );

    await message.channel.send(`🚫 ${message.author} foi punido por 7 dias.`);
  } catch (error) {
    console.error("Erro ao punir:", error);
  }
});

client.login(process.env.TOKEN);
