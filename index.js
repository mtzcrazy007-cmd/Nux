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

if (fs.existsSync("./configs.json")) {
  try {
    configs = JSON.parse(fs.readFileSync("./configs.json", "utf8"));
  } catch (err) {
    console.log("Erro ao carregar configs.json");
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

client.on("guildMemberAdd", async (member) => {
  const config = getConfig(member.guild.id);

  if (!config.canalBoasVindas) return;

  const canal = member.guild.channels.cache.get(config.canalBoasVindas);
  if (!canal) return;

  const mensagem = config.msgBoasVindas.replace("{user}", `${member}`);
  canal.send(mensagem).catch(() => {});
});

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

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild || !message.member) return;

  const config = getConfig(message.guild.id);
  const args = message.content.trim().split(/\s+/);
  const comando = args[0].toLowerCase();

  const isAdmin = message.member.permissions.has(
    PermissionFlagsBits.Administrator
  );

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
    return message.reply("❌ Este comando é restrito a administradores.");
  }

  if (comando === "!aviso") {
    const aviso = args.slice(1).join(" ");

    if (!aviso) {
      return message.reply("Use: `!aviso sua mensagem aqui`");
    }

    const membros = await message.guild.members.fetch();

    message.reply(`📤 Enviando aviso para ${membros.size} membros...`);

    for (const [, membro] of membros) {
      if (membro.user.bot) continue;

      try {
        await membro.send(`📢 **Aviso de ${message.guild.name}**\n\n${aviso}`);
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err) {}
    }

    return message.channel.send("✅ Avisos processados.");
  }

  if (comando === "!boasvindas") {
    const novaMsg = args.slice(1).join(" ");

    if (!novaMsg) {
      return message.reply("Use: `!boasvindas Bem-vindo(a) {user}!`");
    }

    config.canalBoasVindas = message.channel.id;
    config.msgBoasVindas = novaMsg;
    salvarConfigs();

    return message.reply("✅ Boas-vindas configuradas neste canal.");
  }

  if (comando === "!cargoimune") {
    const cargoId = args[1]?.replace(/[<@&>]/g, "");

    if (!cargoId) {
      return message.reply("Mencione o cargo ou cole o ID.");
    }

    config.cargoImune = cargoId;
    salvarConfigs();

    return message.reply("✅ Cargo imune ao antspam salvo.");
  }

  if (comando === "!antspam" && args[1] === "aqui") {
    config.canalAntspam = message.channel.id;
    salvarConfigs();

    return message.reply("✅ Canal antspam configurado aqui.");
  }

  if (comando === "!boost" && args[1] === "aqui") {
    config.canalBoost = message.channel.id;
    salvarConfigs();

    return message.reply("✅ Canal de boost configurado aqui.");
  }

  if (comando === "!cargoticket") {
    const cargoId = args[1]?.replace(/[<@&>]/g, "");

    if (!cargoId) {
      return message.reply("Mencione o cargo de suporte ou cole o ID.");
    }

    config.cargoTicket = cargoId;
    salvarConfigs();

    return message.reply("✅ Cargo de suporte do ticket salvo.");
  }

  if (comando === "!ticket" && args[1] === "aqui") {
    const embed = new EmbedBuilder()
      .setColor("#b20710")
      .setTitle("🎫 Central de Suporte")
      .setDescription("Clique no botão abaixo para abrir um ticket privado.");

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

  if (config.canalAntspam && message.channel.id === config.canalAntspam) {
    const imune =
      isAdmin ||
      (config.cargoImune && message.member.roles.cache.has(config.cargoImune));

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

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  if (!interaction.guild) return;

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
      const canal = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: permissoes
      });

      await interaction.reply({
        content: `✅ Seu ticket foi aberto em: ${canal}`,
        ephemeral: true
      });

      canal.send({
        content: `🎫 Olá ${interaction.user}, descreva seu problema.\n${
          config.cargoTicket ? `<@&${config.cargoTicket}>` : ""
        }`
      });
    } catch (err) {
      console.error("Erro ao criar ticket:", err);

      interaction.reply({
        content: "❌ Falha ao criar o ticket. Verifique as permissões do bot.",
        ephemeral: true
      });
    }
  }
});

client.login(process.env.TOKEN);
