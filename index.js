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

if (fs.existsSync("./configs.json")) {
  try {
    configs = JSON.parse(fs.readFileSync("./configs.json", "utf8"));
  } catch (e) {
    console.error("Erro ao ler configs.json:", e);
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
      canalBoost: null,
      cargoTicket: null,
      canalAviso: null,
      avisosAuto: []
    };
  }

  if (!configs[guildId].avisosAuto) configs[guildId].avisosAuto = [];
  return configs[guildId];
}

function horaBrasil() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date());
}

function dataBrasil() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date());
}

client.once("clientReady", () => {
  console.log(`✅ ${client.user.tag} está online!`);
  console.log(`📌 Servidores: ${client.guilds.cache.size}`);
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
}, 60000);

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
      .setThumbnail(newMember.user.displayAvatarURL({ forceStatic: false }))
      .setTimestamp();

    canal.send({
      content: `🎉 Parabéns ${newMember}!`,
      embeds: [embed]
    }).catch(() => {});
  }
});

// COMANDOS E MENSAGENS
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
      (config.cargoImune && message.member.roles.cache.has(config.cargoImune));

    if (!imune) {
      if (usuariosPunidos.has(message.author.id)) return;
      usuariosPunidos.add(message.author.id);

      await message.delete().catch(() => {});

      if (message.member.moderatable) {
        await message.member.timeout(
          TEMPO_CASTIGO,
          "Spam no canal protegido"
        ).catch(() => {});

        const aviso = await message.channel.send(
          `🚫 ${message.author} foi castigado por 7 dias (Antispam).`
        ).catch(() => null);

        if (aviso) {
          setTimeout(() => aviso.delete().catch(() => {}), 7000);
        }
      }

      setTimeout(() => usuariosPunidos.delete(message.author.id), 10000);
      return;
    }
  }

  if (comando === "!nux") {
    return message.reply("Nux online! 🤖");
  }

  if (comando === "!listservers" || comando === "!sairid") {
    if (message.author.id !== DONO_ID) {
      return message.reply("❌ Acesso negado.");
    }

    if (comando === "!listservers") {
      const lista = client.guilds.cache
        .map(g => `${g.name} (${g.id})`)
        .join("\n");

      return message.reply(`📋 **Servidores:**\n\`\`\`\n${lista || "Nenhum"}\n\`\`\``);
    }

    if (comando === "!sairid") {
      const id = args[1];

      if (!id) {
        return message.reply("Use: `!sairid ID_DO_SERVIDOR`");
      }

      const guildParaSair = client.guilds.cache.get(id);

      if (!guildParaSair) {
        return message.reply("❌ ID inválido.");
      }

      await guildParaSair.leave();
      return message.reply(`✅ Saí do servidor: ${guildParaSair.name}`);
    }
  }

  const comandosRestritos = [
    "!limpar",
    "!comandos",
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

  if (comandosRestritos.includes(comando) && !isAdmin) {
    return message.reply("❌ Sem permissão.");
  }

  switch (comando) {
    case "!comandos": {
      const embedCmd = new EmbedBuilder()
        .setColor("#b20710")
        .setTitle("🤖 Menu de Comandos")
        .setDescription(`
📢 GERAL
\`!nux\`
\`!comandos\`

👑 DONO
\`!listservers\`
\`!sairid ID\`

🧹 MODERAÇÃO
\`!limpar quantidade\`

🚫 ANTSPAM
\`!antspam aqui\`
\`!cargoimune ID ou @cargo\`

🚀 BOOST
\`!boost aqui\`

🎫 TICKETS
\`!ticket aqui\`
\`!cargoticket ID ou @cargo\`

⏰ AVISOS AUTOMÁTICOS
\`!canalaviso aqui\`
\`!avisoauto HH:MM mensagem\`
\`!avisosauto\`
\`!removeravisoauto número\`
        `)
        .setTimestamp();

      return message.channel.send({ embeds: [embedCmd] });
    }

    case "!limpar": {
      const qtd = parseInt(args[1]);

      if (!qtd || qtd < 1 || qtd > 100) {
        return message.reply("Use: `!limpar 1 até 100`");
      }

      try {
        await message.channel.bulkDelete(qtd, true);

        const msgL = await message.channel.send(
          `✅ Limpeza de ${qtd} mensagens concluída.`
        );

        setTimeout(() => msgL.delete().catch(() => {}), 5000);
      } catch (erro) {
        console.log("Erro ao limpar mensagens:", erro);
        return message.reply("❌ Não consegui apagar. Verifique se tenho permissão de Gerenciar Mensagens.");
      }

      return;
    }

    case "!antspam": {
      if (args[1] !== "aqui") {
        return message.reply("Use: `!antspam aqui`");
      }

      config.canalAntspam = message.channel.id;
      salvarConfigs();

      return message.reply("✅ Canal protegido.");
    }

    case "!cargoimune": {
      const cargoId = args[1]?.replace(/[<@&>]/g, "");

      if (!cargoId) {
        return message.reply("Use: `!cargoimune ID_DO_CARGO` ou `!cargoimune @cargo`");
      }

      const cargo = message.guild.roles.cache.get(cargoId);

      if (!cargo) {
        return message.reply("❌ Cargo não encontrado. Use o ID correto ou mencione o cargo.");
      }

      config.cargoImune = cargoId;
      salvarConfigs();

      return message.reply(`✅ Cargo imune configurado: ${cargo}`);
    }

    case "!boost": {
      if (args[1] !== "aqui") {
        return message.reply("Use: `!boost aqui`");
      }

      config.canalBoost = message.channel.id;
      salvarConfigs();

      return message.reply("✅ Canal de boost configurado.");
    }

    case "!cargoticket": {
      const cargoId = args[1]?.replace(/[<@&>]/g, "");

      if (!cargoId) {
        return message.reply("Use: `!cargoticket ID_DO_CARGO` ou `!cargoticket @cargo`");
      }

      const cargo = message.guild.roles.cache.get(cargoId);

      if (!cargo) {
        return message.reply("❌ Cargo não encontrado. Use o ID correto ou mencione o cargo.");
      }

      config.cargoTicket = cargoId;
      salvarConfigs();

      return message.reply(`✅ Cargo da staff para tickets configurado: ${cargo}`);
    }

    case "!ticket": {
      if (args[1] !== "aqui") {
        return message.reply("Use: `!ticket aqui`");
      }

      const embedT = new EmbedBuilder()
        .setColor("#b20710")
        .setTitle("🎫 Suporte")
        .setDescription("Clique abaixo para abrir um atendimento.")
        .setTimestamp();

      const btnT = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("abrir_ticket")
          .setLabel("Abrir Ticket")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🎫")
      );

      return message.channel.send({
        embeds: [embedT],
        components: [btnT]
      });
    }

    case "!canalaviso": {
      if (args[1] !== "aqui") {
        return message.reply("Use: `!canalaviso aqui`");
      }

      config.canalAviso = message.channel.id;
      salvarConfigs();

      return message.reply("✅ Canal de avisos configurado.");
    }

    case "!avisoauto": {
      const hora = args[1];
      const msgAviso = args.slice(2).join(" ");

      if (!hora || !msgAviso) {
        return message.reply("Use: `!avisoauto HH:MM mensagem`");
      }

      if (!/^\d{2}:\d{2}$/.test(hora)) {
        return message.reply("❌ Horário inválido. Use HH:MM, exemplo: `18:30`");
      }

      if (!config.canalAviso) {
        return message.reply("❌ Configure primeiro: `!canalaviso aqui`");
      }

      config.avisosAuto.push({
        hora,
        mensagem: msgAviso,
        ultimoEnvio: null
      });

      salvarConfigs();

      return message.reply(`✅ Aviso automático agendado para ${hora}.`);
    }

    case "!avisosauto": {
      if (!config.avisosAuto.length) {
        return message.reply("❌ Nenhum aviso automático cadastrado.");
      }

      const lista = config.avisosAuto
        .map((aviso, index) => `**${index + 1}.** ${aviso.hora} — ${aviso.mensagem}`)
        .join("\n");

      const embedAvisos = new EmbedBuilder()
        .setColor("#b20710")
        .setTitle("⏰ Avisos Automáticos")
        .setDescription(lista)
        .setTimestamp();

      return message.reply({ embeds: [embedAvisos] });
    }

    case "!removeravisoauto": {
      const numero = parseInt(args[1]);

      if (!numero) {
        return message.reply("Use: `!removeravisoauto número`");
      }

      const index = numero - 1;

      if (!config.avisosAuto[index]) {
        return message.reply("❌ Aviso não encontrado. Use `!avisosauto` para ver a lista.");
      }

      const removido = config.avisosAuto.splice(index, 1)[0];
      salvarConfigs();

      return message.reply(`✅ Aviso das ${removido.hora} removido.`);
    }
  }
});

// INTERAÇÕES TICKET
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  if (!interaction.guild) return;

  const config = getConfig(interaction.guild.id);

  if (interaction.customId === "abrir_ticket") {
    const nomeCanal = `ticket-${interaction.user.username}`.toLowerCase();

    const jaExiste = interaction.guild.channels.cache.find(
      c => c.name === nomeCanal
    );

    if (jaExiste) {
      return interaction.reply({
        content: `⚠️ Você já tem um ticket aberto: ${jaExiste}`,
        ephemeral: true
      });
    }

    const permissionOverwrites = [
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
      permissionOverwrites.push({
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
        name: nomeCanal,
        type: ChannelType.GuildText,
        permissionOverwrites
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("fechar_ticket")
          .setLabel("Fechar")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("🔒")
      );

      const embedTicket = new EmbedBuilder()
        .setColor("#b20710")
        .setTitle("🎫 Ticket Aberto")
        .setDescription(
          `Olá ${interaction.user}, explique seu problema abaixo.\n\n🔒 Apenas você e a equipe conseguem ver este canal.`
        )
        .setTimestamp();

      await canal.send({
        content: `${interaction.user} ${
          config.cargoTicket ? `<@&${config.cargoTicket}>` : ""
        }`,
        embeds: [embedTicket],
        components: [row]
      });

      return interaction.reply({
        content: `✅ Ticket aberto: ${canal}`,
        ephemeral: true
      });
    } catch (erro) {
      console.log("Erro ao criar ticket:", erro);

      return interaction.reply({
        content: "❌ Não consegui abrir o ticket. Verifique minhas permissões.",
        ephemeral: true
      });
    }
  }

  if (interaction.customId === "fechar_ticket") {
    await interaction.reply("🔒 Fechando em 5 segundos...");

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 5000);
  }
});

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

if (!process.env.TOKEN) {
  console.log("❌ TOKEN não encontrado nas Variables.");
  process.exit(1);
}

client.login(process.env.TOKEN);
