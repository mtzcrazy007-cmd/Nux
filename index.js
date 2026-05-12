const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const TEMPO_CASTIGO = 7 * 24 * 60 * 60 * 1000;
let configs = {};

// Carregar configurações do arquivo JSON
if (fs.existsSync("./configs.json")) {
  configs = JSON.parse(fs.readFileSync("./configs.json", "utf-8"));
}

function salvarConfigs() {
  fs.writeFileSync("./configs.json", JSON.stringify(configs, null, 2));
}

function getConfig(guildId) {
  if (!configs[guildId]) {
    configs[guildId] = {
      canalAntspam: null,
      cargoImune: null,
      canalBoasVindas: null,
      msgBoasVindas: "Bem-vindo(a) {user}!",
      canalBoost: null,
      cargoTicket: null
    };
  }
  return configs[guildId];
}

client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

// EVENTO DE BOAS-VINDAS PERSONALIZADO
client.on("guildMemberAdd", async (member) => {
  const config = getConfig(member.guild.id);
  if (!config.canalBoasVindas) return;

  const canal = member.guild.channels.cache.get(config.canalBoasVindas);
  if (!canal) return;

  // Substitui {user} pela menção do membro
  const mensagemFinal = config.msgBoasVindas.replace("{user}", `${member}`);
  
  canal.send(mensagemFinal).catch(() => {});
});

// EVENTO DE BOOST
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  if (!oldMember.premiumSince && newMember.premiumSince) {
    const config = getConfig(newMember.guild.id);
    if (!config.canalBoost) return;

    const canal = newMember.guild.channels.cache.get(config.canalBoost);
    if (!canal) return;

    const embed = new EmbedBuilder()
      .setColor("#b20710")
      .setTitle("🚀 Novo Booster!")
      .setDescription(`${newMember} impulsionou o servidor!\n\nObrigado por apoiar!`)
      .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    canal.send({ content: `🎉 Obrigado, ${newMember}!`, embeds: [embed] }).catch(() => {});
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild || !message.member) return;

  const config = getConfig(message.guild.id);
  const args = message.content.split(" ");
  const comando = args[0].toLowerCase();

  // COMANDO !AVISO (DM PARA TODOS)
  if (comando === "!aviso") {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
    
    const aviso = args.slice(1).join(" ");
    if (!aviso) return message.reply("Digite a mensagem de aviso. Ex: `!aviso Reunião hoje às 20h`.");

    const membros = await message.guild.members.fetch();
    let contagem = 0;

    message.reply(`📤 Enviando aviso para ${membros.size} membros...`);

    membros.forEach(membro => {
      if (membro.user.bot) return;
      membro.send(`📢 **Aviso de ${message.guild.name}**:\n\n${aviso}`)
        .then(() => contagem++)
        .catch(() => {}); // Ignora DMs fechadas
    });

    return;
  }

  // CONFIGURAR MENSAGEM DE BOAS-VINDAS
  if (comando === "!boasvindas") {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
    
    const novaMsg = args.slice(1).join(" ");
    if (!novaMsg) return message.reply("Use: `!boasvindas Bem vindo {user} ao servidor!`");

    config.canalBoasVindas = message.channel.id;
    config.msgBoasVindas = novaMsg;
    salvarConfigs();

    return message.reply(`✅ Mensagem de boas-vindas definida para este canal:\n"${novaMsg}"`);
  }

  // COMANDOS DE CONFIGURAÇÃO RESTANTES
  if (comando === "!cargoimune") {
    const cargoId = args[1]?.replace(/[<@&>]/g, "");
    if (!cargoId) return message.reply("Informe o ID do cargo.");
    config.cargoImune = cargoId;
    salvarConfigs();
    return message.reply("✅ Cargo imune salvo.");
  }

  if (comando === "!antspam" && args[1] === "aqui") {
    config.canalAntspam = message.channel.id;
    salvarConfigs();
    return message.reply("✅ Canal Antspam definido.");
  }

  if (comando === "!boost" && args[1] === "aqui") {
    config.canalBoost = message.channel.id;
    salvarConfigs();
    return message.reply("✅ Canal de Boost definido.");
  }

  if (comando === "!cargoticket") {
    const cargoId = args[1]?.replace(/[<@&>]/g, "");
    config.cargoTicket = cargoId;
    salvarConfigs();
    return message.reply("✅ Cargo do ticket salvo.");
  }

  if (comando === "!ticket" && args[1] === "aqui") {
    const embed = new EmbedBuilder()
      .setColor("#b20710")
      .setTitle("🎫 Suporte")
      .setDescription("Clique abaixo para abrir um ticket.");
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("abrir_ticket").setLabel("Abrir Ticket").setStyle(ButtonStyle.Danger)
    );
    return message.channel.send({ embeds: [embed], components: [row] });
  }

  // LOGICA ANTSPAM
  if (config.canalAntspam && message.channel.id === config.canalAntspam) {
    const imune = message.member.permissions.has(PermissionFlagsBits.Administrator) || 
                  (config.cargoImune && message.member.roles.cache.has(config.cargoImune));
    if (imune) return;

    await message.delete().catch(() => {});
    if (message.member.moderatable) {
      await message.member.timeout(TEMPO_CASTIGO, "Falou no canal proibido");
      message.channel.send(`🚫 ${message.author} foi castigado por 7 dias.`);
    }
  }
});

// INTERAÇÃO DO TICKET
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  const config = getConfig(interaction.guild.id);

  if (interaction.customId === "abrir_ticket") {
    const canal = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.id}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: config.cargoTicket, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
      ]
    });
    interaction.reply({ content: `Ticket aberto: ${canal}`, ephemeral: true });
    canal.send({ content: `🎫 Atendimento iniciado para ${interaction.user}.` });
  }
});

client.login(process.env.TOKEN);
