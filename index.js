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
const usuariosPunidos = new Set();

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
      cargoTicket: null
    };
  }
  return configs[guildId];
}

client.once("ready", () => {
  console.log(`✅ ${client.user.tag} está online!`);
});

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

  // ANTSPAM MELHORADO
  if (config.canalAntspam && message.channel.id === config.canalAntspam) {
    const imune =
      isAdmin ||
      (config.cargoImune && message.member.roles.cache.has(config.cargoImune));

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
          "Falou em canal proibido/Antspam"
        ).catch(() => {});

        const aviso = await message.channel.send(
          `🚫 ${message.author} foi castigado por **7 dias** por enviar mensagem neste canal.`
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

  if (comando === "!nux") {
    return message.reply("Nux online! 🤖");
  }

  const comandosAdm = [
    "!aviso",
    "!boasvindas",
    "!cargoimune",
    "!antspam",
    "!boost",
    "!cargoticket",
    "!ticket"
  ];

  if (comandosAdm.includes(comando) && !isAdmin) {
    return message.reply("❌ Apenas administradores podem usar este comando.");
  }

  if (comando === "!aviso") {
    const aviso = args.slice(1).join(" ");
    if (!aviso) return message.reply("Use: `!aviso sua mensagem`");

    const membros = await message.guild.members.fetch();
    const humanos = membros.filter(m => !m.user.bot);

    message.reply(`📤 Enviando aviso para ${humanos.size} membros...`);

    for (const [, membro] of humanos) {
      try {
        await membro.send(`📢 **Aviso de ${message.guild.name}**\n\n${aviso}`);
        await new Promise(r => setTimeout(r, 1000));
      } catch {}
    }

    return message.channel.send("✅ Processo de avisos finalizado.");
  }

  if (comando === "!boasvindas") {
    const novaMsg = args.slice(1).join(" ");
    if (!novaMsg) {
      return message.reply("Use: `!boasvindas Bem-vindo(a) {user}`");
    }

    config.canalBoasVindas = message.channel.id;
    config.msgBoasVindas = novaMsg;
    salvarConfigs();

    return message.reply("✅ Canal de boas-vindas configurado aqui!");
  }

  if (comando === "!cargoimune") {
    const cargoId = args[1]?.replace(/[<@&>]/g, "");
    if (!cargoId) return message.reply("Use: `!cargoimune ID_DO_CARGO`");

    config.cargoImune = cargoId;
    salvarConfigs();

    return message.reply("✅ Cargo imune ao antspam salvo.");
  }

  if (comando === "!antspam") {
    if (args[1] !== "aqui") return message.reply("Use: `!antspam aqui`");

    config.canalAntspam = message.channel.id;
    salvarConfigs();

    return message.reply("✅ Este canal agora está protegido pelo antspam.");
  }

  if (comando === "!boost") {
    if (args[1] !== "aqui") return message.reply("Use: `!boost aqui`");

    config.canalBoost = message.channel.id;
    salvarConfigs();

    return message.reply("✅ Mensagens de boost serão enviadas aqui.");
  }

  if (comando === "!cargoticket") {
    const cargoId = args[1]?.replace(/[<@&>]/g, "");
    if (!cargoId) return message.reply("Use: `!cargoticket ID_DO_CARGO`");

    config.cargoTicket = cargoId;
    salvarConfigs();

    return message.reply("✅ Cargo do suporte configurado.");
  }

  // TICKET BONITO
  if (comando === "!ticket") {
    if (args[1] !== "aqui") return message.reply("Use: `!ticket aqui`");

    const embed = new EmbedBuilder()
      .setColor("#b20710")
      .setTitle("🎫 Central de Atendimento")
      .setDescription(
        "Precisa de ajuda? Clique no botão abaixo para abrir um ticket.\n\n" +
        "📌 **Evite abrir ticket sem necessidade.**\n" +
        "👥 Nossa equipe irá te atender assim que possível."
      )
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .setFooter({
        text: `${message.guild.name} • Sistema de Tickets`,
        iconURL: message.guild.iconURL({ dynamic: true })
      })
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

  if (interaction.customId === "abrir_ticket") {
    const ticketExistente = interaction.guild.channels.cache.find(c =>
      c.name === `ticket-${interaction.user.username.toLowerCase()}`
    );

    if (ticketExistente) {
      return interaction.reply({
        content:
          `⚠️ Você já está com um ticket aberto.\n\n` +
          `📌 Acesse ${ticketExistente} para continuar seu atendimento com a equipe.`,
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
          `Olá ${interaction.user}, seja bem-vindo(a) ao seu atendimento.\n\n` +
          "Explique abaixo o motivo do seu chamado com o máximo de detalhes possível.\n\n" +
          "🔒 Apenas você e a equipe conseguem ver este canal."
        )
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({
          text: "Para finalizar, clique no botão de fechar ticket."
        })
        .setTimestamp();

      const fecharRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("fechar_ticket")
          .setLabel("Fechar Ticket")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({
        content: `✅ Seu ticket foi criado: ${canal}`,
        ephemeral: true
      });

      await canal.send({
        content: `${interaction.user} ${
          config.cargoTicket ? `<@&${config.cargoTicket}>` : ""
        }`,
        embeds: [embedTicket],
        components: [fecharRow]
      });
    } catch (err) {
      console.error(err);

      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ Erro ao criar o ticket. Verifique as permissões do bot.",
          ephemeral: true
        });
      }
    }
  }

  if (interaction.customId === "fechar_ticket") {
    const embedFechar = new EmbedBuilder()
      .setColor("#2f3136")
      .setTitle("🔒 Ticket Encerrado")
      .setDescription("Este ticket será fechado em **5 segundos**.")
      .setTimestamp();

    await interaction.reply({
      embeds: [embedFechar]
    });

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 5000);
  }
});

if (!process.env.TOKEN) {
  console.log("❌ TOKEN não encontrado. Coloque o TOKEN nas Variables do Railway.");
  process.exit(1);
}

client.login(process.env.TOKEN);
