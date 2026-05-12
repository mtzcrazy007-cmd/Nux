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

client.once("clientReady", (c) => {
  console.log(`✅ ${c.user.tag} está online!`);
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

  try {
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
        await message.delete().catch(() => {});

        const botMember = message.guild.members.me;
        const canTimeout =
          botMember &&
          botMember.permissions.has(PermissionFlagsBits.ModerateMembers);

        if (canTimeout && message.member.moderatable) {
          await message.member.timeout(
            TEMPO_CASTIGO,
            "Falou em canal proibido/Antspam"
          ).catch(() => {});

          const warn = await message.channel.send(
            `🚫 ${message.author} foi castigado por 7 dias por enviar mensagens aqui.`
          ).catch(() => null);

          if (warn) setTimeout(() => warn.delete().catch(() => {}), 5000);
        }

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

    // !aviso mensagem
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

    // !boasvindas mensagem
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

    // !cargoimune ID ou @cargo
    if (comando === "!cargoimune") {
      const cargoId = args[1]?.replace(/[<@&>]/g, "");
      if (!cargoId) return message.reply("Use: `!cargoimune ID_DO_CARGO`");

      config.cargoImune = cargoId;
      salvarConfigs();

      return message.reply("✅ Cargo imune ao antspam salvo.");
    }

    // !antspam aqui
    if (comando === "!antspam") {
      if (args[1] !== "aqui") return message.reply("Use: `!antspam aqui`");

      config.canalAntspam = message.channel.id;
      salvarConfigs();

      return message.reply("✅ Este canal agora está protegido pelo antspam.");
    }

    // !boost aqui
    if (comando === "!boost") {
      if (args[1] !== "aqui") return message.reply("Use: `!boost aqui`");

      config.canalBoost = message.channel.id;
      salvarConfigs();

      return message.reply("✅ Mensagens de boost serão enviadas aqui.");
    }

    // !cargoticket ID ou @cargo
    if (comando === "!cargoticket") {
      const cargoId = args[1]?.replace(/[<@&>]/g, "");
      if (!cargoId) return message.reply("Use: `!cargoticket ID_DO_CARGO`");

      config.cargoTicket = cargoId;
      salvarConfigs();

      return message.reply("✅ Cargo do suporte configurado.");
    }

    // !ticket aqui
    if (comando === "!ticket") {
      if (args[1] !== "aqui") return message.reply("Use: `!ticket aqui`");

      const embed = new EmbedBuilder()
        .setColor("#b20710")
        .setTitle("🎫 Central de Suporte")
        .setDescription("Clique no botão abaixo para abrir um ticket de atendimento.");

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
  } catch (err) {
    console.error("messageCreate error:", err);
  }
});

// BOTÕES
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  if (!interaction.guild) return;

  try {
    const config = getConfig(interaction.guild.id);

    // ABRIR TICKET
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
            PermissionFlagsBits.ReadMessageHistory
          ]
        });
      }

      try {
        const canal = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`,
          type: ChannelType.GuildText,
          permissionOverwrites: permissoes
        });

        const fecharRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("fechar_ticket")
            .setLabel("Fechar Ticket")
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
          content: `✅ Seu ticket foi criado: ${canal}`,
          ephemeral: true
        });

        await canal.send({
          content: `🎫 Olá ${interaction.user}, aguarde um atendente.\n${
            config.cargoTicket ? `<@&${config.cargoTicket}>` : ""
          }`,
          components: [fecharRow]
        });
      } catch (err) {
        console.error("abrir_ticket error:", err);

        if (!interaction.replied) {
          await interaction.reply({
            content: "❌ Erro ao criar o ticket. Verifique as permissões do bot.",
            ephemeral: true
          });
        }
      }
    }

    // FECHAR TICKET
    if (interaction.customId === "fechar_ticket") {
      await interaction.reply("🗑️ O ticket será fechado em 5 segundos...");

      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 5000);
    }
  } catch (err) {
    console.error("interactionCreate error:", err);

    if (interaction.isRepliable() && !interaction.replied) {
      await interaction.reply({
        content: "❌ Ocorreu um erro inesperado.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

if (!process.env.TOKEN) {
  console.log("❌ TOKEN não encontrado. Coloque o TOKEN nas Variables do Railway.");
  process.exit(1);
}

(async () => {
  try {
    await client.login(process.env.TOKEN);
  } catch (err) {
    console.error("❌ Falha ao autenticar o bot:", err);
    process.exit(1);
  }
})();
