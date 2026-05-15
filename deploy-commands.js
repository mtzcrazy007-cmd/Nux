require("dotenv").config();

const {
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const commands = [

  new SlashCommandBuilder()
    .setName("nux")
    .setDescription("Verifica se o bot está online"),

  new SlashCommandBuilder()
    .setName("comandos")
    .setDescription("Abre o painel do bot")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    )

].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" })
  .setToken(process.env.TOKEN);

(async () => {

  try {

    console.log("Registrando comandos globais...");

    await rest.put(
      Routes.applicationCommands(
        process.env.CLIENT_ID
      ),
      { body: commands }
    );

    console.log("✅ Comandos globais registrados.");

  } catch (err) {

    console.error(err);

  }

})();
