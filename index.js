require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once("ready", () => {
  console.log(`✅ ${client.user.tag} está online!`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "nux") {
    return interaction.reply("Nux online! 🤖");
  }

  if (interaction.commandName === "comandos") {
    const embed = new EmbedBuilder()
      .setColor("#b20710")
      .setTitle("🤖 Painel Nux")
      .setDescription("Escolha uma opção abaixo.");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("painel_ticket")
        .setLabel("Ticket")
        .setEmoji("🎫")
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId("painel_status")
        .setLabel("Status")
        .setEmoji("⚙️")
        .setStyle(ButtonStyle.Primary)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "painel_ticket") {
    return interaction.reply({
      content: "🎫 Sistema de ticket ainda será configurado.",
      ephemeral: true
    });
  }

  if (interaction.customId === "painel_status") {
    return interaction.reply({
      content: "✅ Bot online e painel funcionando.",
      ephemeral: true
    });
  }
});

client.login(process.env.TOKEN);
