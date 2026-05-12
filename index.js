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

// CONFIGURAÇÕES
const TEMPO_CASTIGO = 7 * 24 * 60 * 60 * 1000; // 7 dias
let configs = {};

// CARREGAR CONFIGURAÇÕES
if (fs.existsSync("./configs.json")) {
  try {
    configs = JSON.parse(fs.readFileSync("./configs.json", "utf8"));
  } catch (err) {
    console.error("❌ Erro ao carregar configs.json, criando novo objeto.");
    configs = {};
  }
}

// SALVAR CONFIGURAÇÕES
function salvarConfigs() {
  fs.writeFileSync("./configs.json", JSON.stringify(configs, null, 2));
}

// BUSCAR CONFIG POR SERVIDOR
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
  console.log(`✅ ${client.user.tag} está online e operacional!`);
});

// EVENTO: BOAS-VINDAS
client.on("guildMemberAdd", async (member) => {
  const config = getConfig(member.guild.id);
  if (!config.canalBoasVindas) return;

  const canal = member.guild.channels.cache.get(config.canalBoasVindas);
  if (!canal) return;

  const mensagem = config.msgBoasVindas.replace("{user}", `${member}`);
  canal.send(mensagem).catch(() => {});
});

// EVENTO: BOOST
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

    canal.send({ content: `🎉 Obrigado ${newMember}!`, embeds: [embed] }).catch(() => {});
  }
});

// EVENTO: MENSAGENS (COMANDOS E ANTSPAM)
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild || !message.member) return;

  // Prevenção de erro se a mensagem não tiver texto (ex: apenas imagem)
  if (!message.content) return;

  const config = getConfig(message.guild.id);
  const args = message.content.trim().split(/\s+/);
  const comando = args[0].toLowerCase();
  const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);

  // LOGICA ANTSPAM (BLOQUEIO DE CANAL)
  if (config.canalAntspam && message.channel.id === config.canalAntspam) {
    const imune = isAdmin || (config.cargoImune && message.member.roles.cache.has(config.cargoImune));
    
    if (!imune) {
      await message.delete().catch(() => {});
      if (message.member.moderatable) {
        await message.member.timeout(TEMPO_CASTIGO, "Falou em canal proibido/Antspam").catch(() => {});
        return message.channel.send(`🚫 ${message.author} foi castigado por 7 dias por enviar mensagens aqui.`)
          .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
      }
      return;
    }
  }

  // TESTE
  if (comando === "!nux") return message.reply("Nux online! 🤖");

  // COMANDOS ADMINISTRATIVOS
  const comandosAdm = ["!aviso", "!boasvindas", "!cargoimune", "!antspam", "!boost", "!cargoticket", "!ticket"];
  if (comandosAdm.includes(comando) && !isAdmin) {
    return message.reply("❌ Apenas administradores podem usar este comando.");
  }

  // !aviso <mensagem>
  if (comando === "!aviso") {
    const aviso = args.slice(1).join(" ");
    if (!aviso) return message.reply("Use: `!aviso sua mensagem`.");

    const membros = await message.guild.members.fetch();
    message.reply(`📤 Enviando aviso para ${membros.filter(m => !m.user.bot).size} membros. Isso pode demorar...`);

    for (const [, membro] of membros) {
      if (membro.user.bot) continue;
      try {
        await membro.send(`📢 **Aviso de ${message.guild.name}**\n\n${aviso}`);
        await new Promise(r => setTimeout(r, 1000)); // Delay de 1s para evitar BAN por spam
      } catch {
        // Ignora se a DM do usuário estiver fechada
      }
    }
    return message.channel.send("✅ Processo de avisos finalizado.");
  }

  // !boasvindas <mensagem> (Configura no canal atual)
  if (comando === "!boasvindas") {
    const novaMsg = args.slice(1).join(" ");
    if (!novaMsg) return message.reply("Use: `!boasvindas Bem-vindo(a) {user}`");
    config.canalBoasVindas = message.channel.id;
    config.msgBoasVindas = novaMsg;
    salvarConfigs();
    return message.reply("✅ Canal de Boas-vindas configurado aqui!");
  }

  // !cargoimune <@cargo/ID>
  if (comando === "!cargoimune") {
    const cargoId = args[1]?.replace(/[<@&>]/g, "");
    if (!cargoId) return message.reply("Informe o ID ou mencione o cargo.");
    config.cargoImune = cargoId;
    salvarConfigs();
    return message.reply("✅ Cargo imune ao Antspam salvo.");
  }

  // !antspam aqui
  if (comando === "!antspam" && args[1] === "aqui") {
    config.canalAntspam = message.channel.id;
    salvarConfigs();
    return message.reply("✅ Este canal agora é protegido pelo Antspam.");
  }

  // !boost aqui
  if (comando === "!boost" && args[1] === "aqui") {
    config.canalBoost = message.channel.id;
    salvarConfigs();
    return message.reply("✅ As mensagens de Boost serão enviadas aqui.");
  }

  // !cargoticket <@cargo/ID> (Quem responde o ticket)
  if (comando === "!cargoticket") {
    const cargoId = args[1]?.replace(/[<@&>]/g, "");
    if (!cargoId) return message.reply("Informe o ID do cargo da Staff.");
    config.cargoTicket = cargoId;
    salvarConfigs();
    return message.reply("✅ Cargo do suporte configurado.");
  }

  // !ticket aqui
  if (comando === "!ticket" && args[1] === "aqui") {
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

    return message.channel.send({ embeds: [embed], components: [row] });
  }
});

// EVENTO: INTERAÇÕES (BOTÕES)
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  const config = getConfig(interaction.guild.id);

  if (interaction.customId === "abrir_ticket") {
    const permissoes = [
      { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }
    ];

    if (config.cargoTicket) {
      permissoes.push({ id: config.cargoTicket, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
    }

    try {
      const canal = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: permissoes
      });

      const fecharRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("fechar_ticket").setLabel("Fechar Ticket").setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({ content: `✅ Seu ticket foi criado: ${canal}`, ephemeral: true });

      canal.send({
        content: `🎫 Olá ${interaction.user}, aguarde um atendente.\n${config.cargoTicket ? `<@&${config.cargoTicket}>` : ""}`,
        components: [fecharRow]
      });
    } catch (err) {
      console.error(err);
      interaction.reply({ content: "❌ Erro ao criar canal de ticket.", ephemeral: true });
    }
  }

  if (interaction.customId === "fechar_ticket") {
    await interaction.reply({ content: "🗑️ O ticket será excluído em 5 segundos..." });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  }
});

client.login(process.env.TOKEN);
