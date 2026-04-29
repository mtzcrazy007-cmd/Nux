const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once("ready", () => {
  console.log(`Bot online como ${client.user.tag}`);
});

const CANAL_PROIBIDO = "1497952527658782750";
const CARGO_IMUNE = "669228551001866259";
const TEMPO_CASTIGO = 7 * 24 * 60 * 60 * 1000;

client.on("guildMemberAdd", async (member) => {
  try {
    await member.send(`
:FOGO: **SEJA MUITO BEM VINDO AO F7 NUX** :FOGO:
    `);
  } catch (error) {
    console.log(`Não consegui enviar DM para ${member.user.tag}`);
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.member) return;

  if (message.content.toLowerCase() === "!nux") {
    return message.reply("Nux está online 🔥");
  }

  if (message.content.toLowerCase().startsWith("!limpar")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply("Você não tem permissão.");
    }

    const quantidade = parseInt(message.content.split(" ")[1]);

    if (!quantidade || quantidade < 1 || quantidade > 100) {
      return message.reply("Use: !limpar 1-100");
    }

    try {
      await message.channel.bulkDelete(quantidade, true);

      const msg = await message.channel.send(`🧹 Apaguei ${quantidade} mensagens.`);
      setTimeout(() => msg.delete().catch(() => {}), 3000);

      return;
    } catch (error) {
      console.error("Erro ao limpar mensagens:", error);
      return message.reply("Erro ao limpar mensagens.");
    }
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
