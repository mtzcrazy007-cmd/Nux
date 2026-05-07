const {
  Client,
  GatewayIntentBits,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// CONFIGURAÇÕES
const CANAL_PROIBIDO = "1497952527658782750";
const CARGO_IMUNE_ID = "669228551001866259";
const TEMPO_CASTIGO = 7 * 24 * 60 * 60 * 1000;

const CANAL_PAINEL_TICKET = "1499178605434114260";
const STAFF_ROLE_ID = "669228551001866259";
const CANAL_BOOST_ID = "1501756403415646288";

// BOT ONLINE + PAINEL DE TICKET
client.once("ready", async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);

  const canal = await client.channels.fetch(CANAL_PAINEL_TICKET).catch(() => null);
  if (!canal) return console.log("❌ Canal do painel não encontrado.");

  const botao = new ButtonBuilder()
    .setCustomId("abrir_ticket")
    .setLabel("Abrir Ticket")
    .setEmoji("🎫")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(botao);

  try {
    const mensagens = await canal.messages.fetch({ limit: 10 });

    const painelExiste = mensagens.find(
      m => m.author.id === client.user.id && m.components.length > 0
    );

    if (!painelExiste) {
      await canal.send({
        content: `🎫 **CENTRAL DE ATENDIMENTO — F7 NUX**

Clique no botão abaixo para abrir um ticket privado com a equipe.`,
        components: [row]
      });

      console.log("🎫 Painel de ticket enviado.");
    } else {
      console.log("🎫 Painel de ticket já existe.");
    }
  } catch (error) {
    console.log("Erro ao verificar/enviar painel de ticket:", error);
  }
});

// BOAS-VINDAS
client.on("guildMemberAdd", async (member) => {
  member.send(`🔥 **SEJA MUITO BEM VINDO AO F7 NUX** 🔥`).catch(() => {});
});

// DETECTOR DE BOOST
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  if (!oldMember.premiumSince && newMember.premiumSince) {
    const canal = await client.channels.fetch(CANAL_BOOST_ID).catch(() => null);
    if (!canal) return;

    const embed = new EmbedBuilder()
      .setColor("#b20710")
      .setTitle("🚀 Novo Booster!")
      .setDescription(`${newMember} acabou de impulsionar o servidor!

Muito obrigado por apoiar o **F7 NUX** ❤️`)
      .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setFooter({ text: "Obrigado pelo apoio ❤️" })
      .setTimestamp();

    await canal.send({
      content: `🎉 Obrigado pelo boost, ${newMember}!`,
      embeds: [embed]
    }).catch(() => {});
  }
});

// INTERAÇÕES DOS TICKETS
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "abrir_ticket") {
    const nomeCanal = `ticket-${interaction.user.id}`;

    const canalExiste = interaction.guild.channels.cache.find(
      c => c.name === nomeCanal
    );

    if (canalExiste) {
      return interaction.reply({
        content: `❌ Você já possui um ticket aberto: ${canalExiste}`,
        ephemeral: true
      });
    }

    const ticketChannel = await interaction.guild.channels.create({
      name: nomeCanal,
      type: ChannelType.GuildText,
      permissionOverwrites: [
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
        },
        {
          id: STAFF_ROLE_ID,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ReadMessageHistory
          ]
        }
      ]
    });

    const fechar = new ButtonBuilder()
      .setCustomId("fechar_ticket")
      .setLabel("Fechar Ticket")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger);

    const rowFechar = new ActionRowBuilder().addComponents(fechar);

    await ticketChannel.send({
      content: `👋 Olá ${interaction.user}, descreva sua dúvida ou problema.

A equipe **F7 NUX** entrará em contato em breve.`,
      components: [rowFechar]
    });

    return interaction.reply({
      content: `✅ Seu ticket foi criado: ${ticketChannel}`,
      ephemeral: true
    });
  }

  if (interaction.customId === "fechar_ticket") {
    await interaction.reply("🔒 Este ticket será fechado em 5 segundos...");

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 5000);
  }
});

// COMANDOS E MODERAÇÃO
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild || !message.member) return;

  if (message.content.toLowerCase() === "!nux") {
    return message.reply("Nux está online 🔥");
  }

  if (message.content.toLowerCase().startsWith("!limpar")) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply("❌ Você não tem permissão.");
    }

    const quantidade = parseInt(message.content.split(" ")[1]);

    if (!quantidade || quantidade < 1 || quantidade > 100) {
      return message.reply("Use: `!limpar 1-100`.");
    }

    await message.channel.bulkDelete(quantidade, true).catch(() => {
      return message.reply("Erro ao limpar mensagens.");
    });

    const msg = await message.channel.send(`🧹 Apaguei ${quantidade} mensagens.`);
    setTimeout(() => msg.delete().catch(() => {}), 3000);
    return;
  }

  if (message.channel.id === CANAL_PROIBIDO) {
    const imune =
      message.member.roles.cache.has(CARGO_IMUNE_ID) ||
      message.member.permissions.has(PermissionFlagsBits.Administrator);

    if (imune) return;

    try {
      await message.delete();

      if (message.member.moderatable) {
        await message.member.timeout(
          TEMPO_CASTIGO,
          "Falou no canal proibido"
        );

        await message.channel.send(
          `🚫 ${message.author} recebeu castigo de 7 dias por falar aqui.`
        );
      }
    } catch (error) {
      console.error("Erro ao punir:", error);
    }
  }
});

client.login(process.env.TOKEN);
