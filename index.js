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

const DONO_ID = "669163751957725204";

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
const usuariosPunidos = new Set();

// CARREGAR CONFIGS
if (fs.existsSync("./configs.json")) {
  try {
    configs = JSON.parse(fs.readFileSync("./configs.json", "utf8"));
  } catch {
    configs = {};
  }
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
      cargoTicket: null,
      canalAviso: null,
      avisosAuto: []
    };
  }

  if (!configs[guildId].avisosAuto) configs[guildId].avisosAuto = [];
  if (!("canalAviso" in configs[guildId])) configs[guildId].canalAviso = null;

  return configs[guildId];
}

function horaBrasil() {
  const agora = new Date();

  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(agora);

  const hora = partes.find(p => p.type === "hour").value;
  const minuto = partes.find(p => p.type === "minute").value;

  return `${hora}:${minuto}`;
}

function dataBrasil() {
  const agora = new Date();

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(agora);
}

// BOT ONLINE
client.once("ready", () => {
  console.log(`✅ ${client.user.tag} está online!`);
  console.log(`📌 Estou em ${client.guilds.cache.size} servidores.`);
});

// AVISOS AUTOMÁTICOS
setInterval(async () => {
  const horaAtual = horaBrasil();
  const dataAtual = dataBrasil();

  for (const guildId in configs) {
    const config = getConfig(guildId);

    if (!config.canalAviso || !config.avisosAuto.length) continue;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) continue;

    const canal = guild.channels.cache.get(config.canalAviso);
    if (!canal) continue;

    for (const aviso of config.avisosAuto) {
      if (aviso.hora === horaAtual && aviso.ultimoEnvio !== dataAtual) {

        await canal.send(aviso.mensagem).catch(() => {});

        aviso.ultimoEnvio = dataAtual;
        salvarConfigs();
      }
    }
  }
}, 60 * 1000);

// BOAS-VINDAS
client.on("guildMemberAdd", async (member) => {
  const config = getConfig(member.guild.id);

  if (!config.canalBoasVindas) return;

  const canal = member.guild.channels.cache.get(config.canalBoasVindas);
  if (!canal) return;

  const mensagem = config.msgBoasVindas.replace("{user}", `${member}`);

  canal.send(mensagem).catch(() => {});
});

// BOOST
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  if (!oldMember.premiumSince && newMember.premiumSince) {

    const config = getConfig(newMember.guild.id);

    if (!config.canalBoost) return;

    const canal = newMember.guild.channels.cache.get(config.canalBoost);
    if (!canal) return;

    const embed = new EmbedBuilder()
      .setColor("#ff73fa")
      .setTitle("🚀 Novo Booster!")
      .setDescription(`${newMember} impulsionou o servidor!\n\nObrigado pelo apoio ❤️`)
      .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    canal.send({
      content: `🎉 Obrigado ${newMember}!`,
      embeds: [embed]
    }).catch(() => {});
  }
});

// MENSAGENS / COMANDOS
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild || !message.member) return;

  const config = getConfig(message.guild.id);

  const args = message.content.trim().split(/\s+/);
  const comando = args[0]?.toLowerCase();

  const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);

  // ANTSPAM
  if (config.canalAntspam && message.channel.id === config.canalAntspam) {

    const imune =
      isAdmin ||
      (config.cargoImune &&
      message.member.roles.cache.has(config.cargoImune));

    if (!imune) {

      const jaEstaPunido =
        message.member.communicationDisabledUntilTimestamp &&
        message.member.communicationDisabledUntilTimestamp > Date.now();

      if (jaEstaPunido || usuariosPunidos.has(message.author.id)) {
        return;
      }

      usuariosPunidos.add(message.author.id);

      await message.delete().catch(() => {});

      if (message.member.moderatable) {

        await message.member.timeout(
          TEMPO_CASTIGO,
          "Falou em canal proibido"
        ).catch(() => {});

        const aviso = await message.channel.send(
          `🚫 ${message.author} foi castigado por 7 dias.`
        ).catch(() => null);

        if (aviso) {
          setTimeout(() => aviso.delete().catch(() => {}), 7000);
        }
      }

      setTimeout(() => {
        usuariosPunidos.delete(message.author.id);
      }, 10000);

      return;
    }
  }

  // !nux
  if (comando === "!nux") {
    return message.reply("Nux online! 🤖");
  }

  // !listservers
  if (comando === "!listservers") {

    if (message.author.id !== DONO_ID) {
      return message.reply("❌ Sem permissão.");
    }

    const lista = client.guilds.cache.map(g =>
      `${g.name} | ${g.id}`
    ).join("\n");

    return message.reply(`📋 Servidores:\n\`\`\`\n${lista}\n\`\`\``);
  }

  // !sairid
  if (comando === "!sairid") {

    if (message.author.id !== DONO_ID) {
      return message.reply("❌ Sem permissão.");
    }

    const guildId = args[1];

    if (!guildId) {
      return message.reply("Use: `!sairid ID_DO_SERVIDOR`");
    }

    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      return message.reply("❌ Servidor não encontrado.");
    }

    await guild.leave();

    return message.reply(`✅ Saí de ${guild.name}`);
  }

  const comandosAdm = [
    "!limpar",
    "!comandos",
    "!boasvindas",
    "!cargoimune",
    "!antspam",
    "!boost",
    "!cargoticket",
    "!ticket",
    "!canalaviso",
    "!avisoauto",
    "!avisosauto",
    "!removeravisoauto"
  ];

  if (comandosAdm.includes(comando) && !isAdmin) {
    return message.reply("❌ Apenas administradores.");
  }

  // !comandos
  if (comando === "!comandos") {

    const embed = new EmbedBuilder()
      .setColor("#b20710")
      .setTitle("🤖 Comandos")
      .setDescription(`
📢 GERAL
\`!nux\`
\`!comandos\`

🧹 MODERAÇÃO
\`!limpar quantidade\`

🚫 ANTSPAM
\`!antspam aqui\`
\`!cargoimune ID\`

👋 BOAS-VINDAS
\`!boasvindas mensagem\`

🚀 BOOST
\`!boost aqui\`

🎫 TICKETS
\`!ticket aqui\`
\`!cargoticket ID\`

⏰ AVISOS
\`!canalaviso aqui\`
\`!avisoauto HH:MM mensagem\`
\`!avisosauto\`
\`!removeravisoauto número\`
      `)
      .setTimestamp();

    return message.channel.send({
      embeds: [embed]
    });
  }

  // !limpar
if (comando === "!limpar") {

  const quantidade = parseInt(args[1]);

  if (isNaN(quantidade)) {
    return message.reply("❌ Use: `!limpar quantidade`");
  }

  if (quantidade < 1 || quantidade > 100) {
    return message.reply("❌ Escolha um número entre 1 e 100.");
  }

  try {

    // apaga a mensagem do comando
    await message.delete().catch(() => {});

    // pega mensagens recentes
    const mensagens = await message.channel.messages.fetch({
      limit: quantidade
    });

    // filtra mensagens menores de 14 dias
    const recentes = mensagens.filter(msg => {
      return Date.now() - msg.createdTimestamp < 1209600000;
    });

    // apaga mensagens
    await message.channel.bulkDelete(recentes, true);

    const aviso = await message.channel.send(
      `✅ ${recentes.size} mensagens apagadas.`
    );

    setTimeout(() => {
      aviso.delete().catch(() => {});
    }, 4000);

  } catch (err) {

    console.log("Erro no !limpar:", err);

    return message.channel.send(
      "❌ Não consegui apagar as mensagens."
    );
  }

  return;
}

  // !boasvindas
  if (comando === "!boasvindas") {

    const novaMsg = args.slice(1).join(" ");

    if (!novaMsg) {
      return message.reply(
        "Use: `!boasvindas Bem-vindo(a) {user}`"
      );
    }

    config.canalBoasVindas = message.channel.id;
    config.msgBoasVindas = novaMsg;

    salvarConfigs();

    return message.reply("✅ Boas-vindas configuradas.");
  }

  // !cargoimune
  if (comando === "!cargoimune") {

    const cargoId = args[1]?.replace(/[<@&>]/g, "");

    if (!cargoId) {
      return message.reply("Use: `!cargoimune ID_DO_CARGO`");
    }

    config.cargoImune = cargoId;

    salvarConfigs();

    return message.reply("✅ Cargo imune configurado.");
  }

  // !antspam
  if (comando === "!antspam") {

    if (args[1] !== "aqui") {
      return message.reply("Use: `!antspam aqui`");
    }

    config.canalAntspam = message.channel.id;

    salvarConfigs();

    return message.reply("✅ Canal protegido.");
  }

  // !boost
  if (comando === "!boost") {

    if (args[1] !== "aqui") {
      return message.reply("Use: `!boost aqui`");
    }

    config.canalBoost = message.channel.id;

    salvarConfigs();

    return message.reply("✅ Canal de boost configurado.");
  }

  // !cargoticket
  if (comando === "!cargoticket") {

    const cargoId = args[1]?.replace(/[<@&>]/g, "");

    if (!cargoId) {
      return message.reply("Use: `!cargoticket ID_DO_CARGO`");
    }

    config.cargoTicket = cargoId;

    salvarConfigs();

    return message.reply("✅ Cargo do ticket configurado.");
  }

  // !ticket
  if (comando === "!ticket") {

    if (args[1] !== "aqui") {
      return message.reply("Use: `!ticket aqui`");
    }

    const embed = new EmbedBuilder()
      .setColor("#b20710")
      .setTitle("🎫 Central de Atendimento")
      .setDescription(
        "Clique no botão abaixo para abrir um ticket."
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("abrir_ticket")
        .setLabel("Abrir Ticket")
        .setEmoji("🎫")
        .setStyle(ButtonStyle.Danger)
    );

    return message.channel.send({
      embeds: [embed],
      components: [row]
    });
  }
});

// BOTÕES
client.on("interactionCreate", async (interaction) => {

  if (!interaction.isButton()) return;
  if (!interaction.guild) return;

  const config = getConfig(interaction.guild.id);

  // ABRIR TICKET
  if (interaction.customId === "abrir_ticket") {

    const ticketExistente =
      interaction.guild.channels.cache.find(c =>
        c.name ===
        `ticket-${interaction.user.username.toLowerCase()}`
      );

    if (ticketExistente) {
      return interaction.reply({
        content: `⚠️ Você já possui um ticket aberto: ${ticketExistente}`,
        ephemeral: true
      });
    }

    const permissoes = [
      {
        id: interaction.guild.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory
        ]
      }
    ];

    if (config.cargoTicket) {

      permissoes.push({
        id: config.cargoTicket,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory
        ]
      });
    }

    try {

      const canal = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`.toLowerCase(),
        type: ChannelType.GuildText,
        permissionOverwrites: permissoes
      });

      const embedTicket = new EmbedBuilder()
        .setColor("#b20710")
        .setTitle("🎫 Ticket Aberto")
        .setDescription(
          `Olá ${interaction.user}, explique seu problema abaixo.`
        )
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("fechar_ticket")
          .setLabel("Fechar Ticket")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({
        content: `✅ Ticket criado: ${canal}`,
        ephemeral: true
      });

      await canal.send({
        content: `${interaction.user} ${
          config.cargoTicket
          ? `<@&${config.cargoTicket}>`
          : ""
        }`,
        embeds: [embedTicket],
        components: [row]
      });

    } catch (err) {

      console.log(err);

      return interaction.reply({
        content: "❌ Erro ao criar ticket.",
        ephemeral: true
      });
    }
  }

  // FECHAR TICKET
  if (interaction.customId === "fechar_ticket") {

    const embed = new EmbedBuilder()
      .setColor("#2f3136")
      .setTitle("🔒 Ticket encerrado")
      .setDescription("Este ticket será apagado em 5 segundos.")
      .setTimestamp();

    await interaction.reply({
      embeds: [embed]
    });

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 5000);
  }
});

// TOKEN
if (!process.env.TOKEN) {
  console.log("❌ TOKEN não encontrado.");
  process.exit(1);
}

client.login(process.env.TOKEN);
