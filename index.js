const CANAL_PROIBIDO = "1497952527658782750";
const CARGO_IMUNE = "669228551001866259";
const TEMPO_CASTIGO = 7 * 24 * 60 * 60 * 1000;

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.member) return;

  if (message.content.toLowerCase() === "!nux") {
    return message.reply("Nux está online 🔥");
  }

  if (message.channel.id !== CANAL_PROIBIDO) return;
  if (message.member.roles.cache.has(CARGO_IMUNE)) return;

  try {
    await message.delete();

    console.log("Punindo:", message.author.tag);

    await message.member.timeout(
      TEMPO_CASTIGO,
      "Enviou mensagem em canal proibido"
    );

    const aviso = await message.channel.send(`🚫 ${message.author} foi punido por 7 dias.`);
    setTimeout(() => aviso.delete(), 5000);

  } catch (error) {
    console.error("Erro ao punir:", error);
  }
});
