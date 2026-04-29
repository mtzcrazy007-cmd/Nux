const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const CANAL_PROIBIDO = "1497952527658782750";
const CARGO_IMUNE = "669228551001866259";
const TEMPO_CASTIGO = 7 * 24 * 60 * 60 * 1000;

const CANAL_PAINEL_TICKET = "1499178605434114260";
const SEU_ID = "669228551001866259";

// BOT ONLINE + PAINEL DE TICKET
client.once("ready", async () => {
  console.log(`Bot online como ${client.user.tag}`);

  const canal = await client.channels.fetch(CANAL_PAINEL_TICKET).catch(() => null);
  if (!canal) return console.log("Canal do painel de ticket não encontrado.");

  try {
    const mensagens = await canal.messages.fetch({ limit: 10 });
    if (mensagens.size > 0) await canal.bulkDelete(mensagens, true);
  } catch {
    console.log("Não consegui apagar mensagens antigas do painel.");
  }

  const botao = new ButtonBuilder()
    .setCustomId("abrir_ticket")
    .setLabel("Abrir Ticket")
    .setEmoji("🎫")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(botao);

  await canal.send({
    content: `🎫 **CENTRAL DE ATENDIMENTO — F7 NUX**

Clique no botão abaixo para abrir um ticket privado com a equipe.`,
    components: [row]
  });

  console.log("Painel de ticket enviado.");
});

// BOAS-VINDAS
client.on("guildMemberAdd", async (member) => {
  try {
    await member.send(`
🔥 **SEJA MUITO BEM VINDO AO F7 NUX** 🔥
    `);
  } catch (error) {
    console.log(`Não consegui enviar DM para ${member.user.tag}`);
  }
});

// SISTEMA DE TICKET
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "abrir_ticket") {
    const nomeCanal = `ticket-${interaction.user.id}`;

    const canalExiste = interaction.guild.channels.cache.find(
      c => c.name === nomeCanal
    );

    if (canalExiste) {
      return interaction.reply({
        content: `❌ Você já tem um ticket aberto: ${canalExiste}`,
        ephemeral: true
      });
    }

    const ticketChannel = await interaction.guild.channels.create({
      name: nomeCanal,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles
          ],
        },
        {
          id: SEU_ID,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles
          ],
        },
      ],
    });

    const fechar = new ButtonBuilder()
      .setCustomId("fechar_ticket")
      .setLabel("Fechar Ticket")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger);

    const rowFechar = new ActionRowBuilder().addComponents(fechar);

    await ticketChannel.send({
      content: `👋 Olá ${interaction.user}, descreva seu problema.

A equipe **F7 NUX** irá te atender em breve.`,
      components: [rowFechar]
    });

    return interaction.reply({
      content: `✅ Ticket criado: ${ticketChannel}`,
      ephemeral: true
    });
  }

  if (interaction.customId === "fechar_ticket") {
    await interaction.reply("🔒 Fechando ticket em 5 segundos...");

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 5000);
  }
});

// COMANDOS E ANTI-SPAM
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.member) return;

  if (message.content.toLowerCase() === "!nux") {
    return message.reply("Nux está online 🔥");
  }

  if (message.content.toLowerCase().startsWith("!limpar")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply("Você não tem permissão.");
    }

    const quantidade = parseInt(message.content.split(" ")[1]);

    if (!quantidade || quantidade < 1 || quantidade > 100) {
      return message.reply("Use: !limpar 1-100");
    }

    try {
      await message.channel.bulkDelete(quantidade, true);

      const msg = await message.channel.send(`🧹 Apaguei ${quantidade} mensagens.`);
      setTimeout(() => msg.delete().catch(() => {}), 3000);

      return;
    } catch (error) {
      console.error("Erro ao limpar mensagens:", error);
      return message.reply("Erro ao limpar mensagens.");
    }
  }

  if (message.channel.id !== CANAL_PROIBIDO) return;
  if (message.author.id === CARGO_IMUNE) return;

  try {
    await message.delete();

    await message.member.timeout(
      TEMPO_CASTIGO,
      "Enviou mensagem em canal proibido"
    );

    await message.channel.send(`🚫 ${message.author} foi punido por 7 dias.`);
  } catch (error) {
    console.error("Erro ao punir:", error);
  }
});

client.login(process.env.TOKEN);
