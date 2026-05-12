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
    configs = JSON.parse(
      fs.readFileSync("./configs.json", "utf8")
    );
  } catch {
    configs = {};
  }
}

function salvarConfigs() {
  fs.writeFileSync(
    "./configs.json",
    JSON.stringify(configs, null, 2)
  );
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

  if (!configs[guildId].avisosAuto) {
    configs[guildId].avisosAuto = [];
  }

  return configs[guildId];
}

function horaBrasil() {
  const agora = new Date();

  const partes =
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(agora);

  const hora = partes.find(
    p => p.type === "hour"
  ).value;

  const minuto = partes.find(
    p => p.type === "minute"
  ).value;

  return `${hora}:${minuto}`;
}

function dataBrasil() {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }
  ).format(new Date());
}

client.once("clientReady", () => {
  console.log(
    `✅ ${client.user.tag} está online!`
  );

  console.log(
    `📌 Estou em ${client.guilds.cache.size} servidores.`
  );
});

// AVISOS AUTOMÁTICOS
setInterval(async () => {
  const horaAtual = horaBrasil();

  const dataAtual = dataBrasil();

  for (const guildId in configs) {
    const config = getConfig(guildId);

    if (
      !config.canalAviso ||
      !config.avisosAuto.length
    )
      continue;

    const guild =
      client.guilds.cache.get(guildId);

    if (!guild) continue;

    const canal =
      guild.channels.cache.get(
        config.canalAviso
      );

    if (!canal) continue;

    for (const aviso of config.avisosAuto) {
      if (
        aviso.hora === horaAtual &&
        aviso.ultimoEnvio !== dataAtual
      ) {
        await canal
          .send(aviso.mensagem)
          .catch(() => {});

        aviso.ultimoEnvio = dataAtual;

        salvarConfigs();
      }
    }
  }
}, 60 * 1000);

// BOOST
client.on(
  "guildMemberUpdate",
  async (oldMember, newMember) => {
    if (
      !oldMember.premiumSince &&
      newMember.premiumSince
    ) {
      const config = getConfig(
        newMember.guild.id
      );

      if (!config.canalBoost) return;

      const canal =
        newMember.guild.channels.cache.get(
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

      canal
        .send({
          content: `🎉 Obrigado ${newMember}!`,
          embeds: [embed]
        })
        .catch(() => {});
    }
  }
);

// COMANDOS
client.on(
  "messageCreate",
  async message => {
    if (
      message.author.bot ||
      !message.guild ||
      !message.member
    )
      return;

    const config = getConfig(
      message.guild.id
    );

    const args =
      message.content.trim().split(/\s+/);

    const comando =
      args[0]?.toLowerCase();

    const isAdmin =
      message.member.permissions.has(
        PermissionFlagsBits.Administrator
      );

    // ANTSPAM
    if (
      config.canalAntspam &&
      message.channel.id ===
        config.canalAntspam
    ) {
      const imune =
        isAdmin ||
        (config.cargoImune &&
          message.member.roles.cache.has(
            config.cargoImune
          ));

      if (!imune) {
        const jaPunido =
          message.member
            .communicationDisabledUntilTimestamp &&
          message.member
            .communicationDisabledUntilTimestamp >
            Date.now();

        if (
          jaPunido ||
          usuariosPunidos.has(
            message.author.id
          )
        ) {
          return;
        }

        usuariosPunidos.add(
          message.author.id
        );

        await message.delete().catch(() => {});

        if (message.member.moderatable) {
          await message.member
            .timeout(
              TEMPO_CASTIGO,
              "Falou no canal antispam"
            )
            .catch(() => {});

          const aviso =
            await message.channel
              .send(
                `🚫 ${message.author} foi castigado por 7 dias.`
              )
              .catch(() => null);

          if (aviso) {
            setTimeout(() => {
              aviso
                .delete()
                .catch(() => {});
            }, 7000);
          }
        }

        setTimeout(() => {
          usuariosPunidos.delete(
            message.author.id
          );
        }, 10000);

        return;
      }
    }

    if (comando === "!nux") {
      return message.reply(
        "Nux online! 🤖"
      );
    }

    if (comando === "!listservers") {
      if (message.author.id !== DONO_ID) {
        return message.reply(
          "❌ Sem permissão."
        );
      }

      const lista = client.guilds.cache
        .map(g => `${g.name} | ${g.id}`)
        .join("\n");

      return message.reply(
        `📋 Servidores:\n\`\`\`\n${lista}\n\`\`\``
      );
    }

    if (comando === "!sairid") {
      if (message.author.id !== DONO_ID) {
        return message.reply(
          "❌ Sem permissão."
        );
      }

      const guildId = args[1];

      if (!guildId) {
        return message.reply(
          "Use: `!sairid ID`"
        );
      }

      const guild =
        client.guilds.cache.get(guildId);

      if (!guild) {
        return message.reply(
          "❌ Servidor não encontrado."
        );
      }

      const nomeServidor = guild.name;

      await guild.leave();

      return message.reply(
        `✅ Saí do servidor: ${nomeServidor}`
      );
    }

    const comandosAdm = [
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

    if (
      comandosAdm.includes(comando) &&
      !isAdmin
    ) {
      return message.reply(
        "❌ Apenas administradores podem usar este comando."
      );
    }

    // COMANDOS
    if (comando === "!comandos") {
      const embed = new EmbedBuilder()
        .setColor("#b20710")
        .setTitle("🤖 Comandos do Bot")
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
\`!cargoimune ID\`

🚀 BOOST
\`!boost aqui\`

🎫 TICKETS
\`!ticket aqui\`
\`!cargoticket ID\`

⏰ AVISOS AUTOMÁTICOS
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
  }
);

// BOTÕES
client.on(
  "interactionCreate",
  async interaction => {
    if (!interaction.isButton()) return;

    if (!interaction.guild) return;

    const config = getConfig(
      interaction.guild.id
    );

    if (
      interaction.customId ===
      "abrir_ticket"
    ) {
      const ticketExistente =
        interaction.guild.channels.cache.find(
          c =>
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
          deny: [
            PermissionFlagsBits.ViewChannel
          ]
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
        const canal =
          await interaction.guild.channels.create(
            {
              name: `ticket-${interaction.user.username}`.toLowerCase(),
              type:
                ChannelType.GuildText,
              permissionOverwrites:
                permissoes
            }
          );

        const embedTicket =
          new EmbedBuilder()
            .setColor("#b20710")
            .setTitle(
              "🎫 Ticket Aberto"
            )
            .setDescription(
              `Olá ${interaction.user}, explique seu problema abaixo.\n\n🔒 Apenas você e a equipe conseguem ver este canal.`
            )
            .setTimestamp();

        const fecharRow =
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(
                "fechar_ticket"
              )
              .setLabel(
                "Fechar Ticket"
              )
              .setEmoji("🔒")
              .setStyle(
                ButtonStyle.Secondary
              )
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
          components: [fecharRow]
        });
      } catch {
        if (!interaction.replied) {
          await interaction.reply({
            content:
              "❌ Erro ao criar ticket.",
            ephemeral: true
          });
        }
      }
    }

    // FECHAR TICKET
    if (
      interaction.customId ===
      "fechar_ticket"
    ) {
      const embedFechar =
        new EmbedBuilder()
          .setColor("#2f3136")
          .setTitle(
            "🔒 Ticket Encerrado"
          )
          .setDescription(
            "Este ticket será fechado em 5 segundos."
          )
          .setTimestamp();

      await interaction.reply({
        embeds: [embedFechar]
      });

      setTimeout(() => {
        interaction.channel
          .delete()
          .catch(() => {});
      }, 5000);
    }
  }
);

process.on(
  "unhandledRejection",
  console.error
);

process.on(
  "uncaughtException",
  console.error
);

if (!process.env.TOKEN) {
  console.log(
    "❌ TOKEN não encontrado."
  );

  process.exit(1);
}

client.login(process.env.TOKEN);
