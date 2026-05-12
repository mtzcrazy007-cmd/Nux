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

// CONFIG
const TEMPO_CASTIGO = 7 * 24 * 60 * 60 * 1000;
let configs = {};

// CARREGAR CONFIGS
if (fs.existsSync("./configs.json")) {
  try {
    configs = JSON.parse(
      fs.readFileSync("./configs.json", "utf8")
    );
  } catch (err) {
    console.log("Erro ao carregar configs.");
    configs = {};
  }
}

// SALVAR CONFIGS
function salvarConfigs() {
  fs.writeFileSync(
    "./configs.json",
    JSON.stringify(configs, null, 2)
  );
}

// PEGAR CONFIGS
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

// BOT ONLINE
client.once("ready", () => {
  console.log(`✅ ${client.user.tag} online!`);
});

// BOAS VINDAS
client.on("guildMemberAdd", async (member) => {
  const config = getConfig(member.guild.id);

  if (!config.canalBoasVindas) return;

  const canal = member.guild.channels.cache.get(
    config.canalBoasVindas
  );

  if (!canal) return;

  const mensagem = config.msgBoasVindas.replace(
    "{user}",
    `${member}`
  );

  canal.send(mensagem).catch(() => {});
});

// BOOST
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  if (!oldMember.premiumSince && newMember.premiumSince) {
    const config = getConfig(newMember.guild.id);

    if (!config.canalBoost) return;

    const canal = newMember.guild.channels.cache.get(
      config.canalBoost
    );

    if (!canal) return;

    const embed = new EmbedBuilder()
      .setColor("#ff73fa")
      .setTitle("🚀 Novo Booster!")
      .setDescription(
        `${newMember} impulsionou o servidor!\n\nObrigado pelo apoio ❤️`
      )
      .setThumbnail(
        newMember.user.displayAvatarURL({
          dynamic: true
        })
      )
      .setTimestamp();

    canal.send({
      content: `🎉 Obrigado ${newMember}!`,
      embeds: [embed]
    }).catch(() => {});
  }
});

// COMANDOS
client.on("messageCreate", async (message) => {
  if (
    message.author.bot ||
    !message.guild ||
    !message.member
  ) return;

  const config = getConfig(message.guild.id);

  const args = message.content.trim().split(/\s+/);
  const comando = args[0].toLowerCase();

  const isAdmin =
    message.member.permissions.has(
      PermissionFlagsBits.Administrator
    );

  // NUX
  if (comando === "!nux") {
    return message.reply("Nux online! 🤖");
  }

  // COMANDOS ADM
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
    return message.reply(
      "❌ Você não possui permissão."
    );
  }

  // AVISO
  if (comando === "!aviso") {
    const aviso = args.slice(1).join(" ");

    if (!aviso) {
      return message.reply(
        "Digite a mensagem do aviso."
      );
    }

    const membros = await message.guild.members.fetch();

    message.reply(
      `📤 Enviando aviso para ${membros.size} membros...`
    );

    for (const [, membro] of membros) {
      if (membro.user.bot) continue;

      try {
        await membro.send(
          `📢 Aviso de ${message.guild.name}\n\n${aviso}`
        );

        await new Promise((resolve) =>
          setTimeout(resolve, 500)
        );
      } catch {}
    }

    message.channel.send(
      "✅ Avisos enviados."
    );

    return;
  }

  // BOAS VINDAS
  if (comando === "!boasvindas") {
    const novaMsg = args.slice(1).join(" ");

    if (!novaMsg) {
      return message.reply(
        "Use: !boasvindas Bem vindo {user}"
      );
    }

    config.canalBoasVindas =
      message.channel.id;

    config.msgBoasVindas = novaMsg;

    salvarConfigs();

    return message.reply(
      "✅ Boas-vindas configuradas."
    );
  }

  // CARGO IMUNE
  if (comando === "!cargoimune") {
    const cargoId =
      args[1]?.replace(/[<@&>]/g, "");

    if (!cargoId) {
      return message.reply(
        "Informe o ID do cargo."
      );
    }

    config.cargoImune = cargoId;

    salvarConfigs();

    return message.reply(
      "✅ Cargo imune salvo."
    );
  }

  // ANTSPAM
  if (
    comando === "!antspam" &&
    args[1] === "aqui"
  ) {
    config.canalAntspam =
      message.channel.id;

    salvarConfigs();

    return message.reply(
      "✅ Canal antspam configurado."
    );
  }

  // BOOST
  if (
    comando === "!boost" &&
    args[1] === "aqui"
  ) {
    config.canalBoost =
      message.channel.id;

    salvarConfigs();

    return message.reply(
      "✅ Canal de boost configurado."
    );
  }

  // CARGO TICKET
  if (comando === "!cargoticket") {
    const cargoId =
      args[1]?.replace(/[<@&>]/g, "");

    if (!cargoId) {
      return message.reply(
        "Informe o ID do cargo."
      );
    }

    config.cargoTicket = cargoId;

    salvarConfigs();

    return message.reply(
      "✅ Cargo do ticket salvo."
    );
  }

  // PAINEL TICKET
  if (
    comando === "!ticket" &&
    args[1] === "aqui"
  ) {
    const embed = new EmbedBuilder()
      .setColor("#b20710")
      .setTitle("🎫 Central de Suporte")
      .setDescription(
        "Clique no botão abaixo para abrir um ticket."
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("abrir_ticket")
        .setLabel("Abrir Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    return message.channel.send({
      embeds: [embed],
      components: [row]
    });
  }

  // ANTSPAM LOGICA
  if (
    config.canalAntspam &&
    message.channel.id === config.canalAntspam
  ) {
    const imune =
      isAdmin ||
      (
        config.cargoImune &&
        message.member.roles.cache.has(
          config.cargoImune
        )
      );

    if (imune) return;

    await message.delete().catch(() => {});

    if (message.member.moderatable) {
      await message.member.timeout(
        TEMPO_CASTIGO,
        "Falou em canal proibido"
      );

      message.channel.send(
        `🚫 ${message.author} foi castigado por 7 dias.`
      );
    }
  }
});

// BOTÃO TICKET
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const config = getConfig(interaction.guild.id);

  if (interaction.customId === "abrir_ticket") {
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
          PermissionFlagsBits.AttachFiles
        ]
      }
    ];

    if (config.cargoTicket) {
      permissoes.push({
        id: config.cargoTicket,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages
        ]
      });
    }

    try {
      const canal =
        await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`,
          type: ChannelType.GuildText,
          permissionOverwrites: permissoes
        });

      await interaction.reply({
        content: `✅ Ticket criado: ${canal}`,
        ephemeral: true
      });

      canal.send(
        `🎫 Olá ${interaction.user}, aguarde atendimento.\n${
          config.cargoTicket
            ? `<@&${config.cargoTicket}>`
            : ""
        }`
      );
    } catch (err) {
      console.log(err);

      interaction.reply({
        content:
          "❌ Não consegui criar o ticket.",
        ephemeral: true
      });
    }
  }
});

// TOKEN BOT
client.login("COLE_SEU_TOKEN_AQUI");
