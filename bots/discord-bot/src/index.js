import { Client, Events, GatewayIntentBits } from "discord.js";
import { GoogleGenAI } from "@google/genai";
import util from "minecraft-server-util";
import http from "http";

// Servidor Web Keep-Alive na porta 3000 escutando em 0.0.0.0
const PORT = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.write("Bot ativo e online!");
    res.end();
  })
  .listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Servidor web de keep-alive rodando na porta ${PORT}`);
  });

const token = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;
const aiKey = process.env.GEMINI_API_KEY;

if (!token) {
  console.error("Token do Discord não encontrado nos Secrets.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: aiKey });
const SERVER_IP = "Geanncomgg1.aternos.me";
const SERVER_PORT = 51384;

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

bot.once(Events.ClientReady, (client) => {
  console.log(`🤖 Bot online com IA Gemini: ${client.user.tag}`);
});

bot.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const texto = message.content.trim();

  // Comando !status do Minecraft
  if (texto.toLowerCase() === "!status") {
    try {
      const result = await util.status(SERVER_IP, SERVER_PORT);
      message.reply(
        `🟢 **UMBRYON MINECRAFT ONLINE!**\n` +
          `🌐 IP: \`${SERVER_IP}\` | Porta: \`${SERVER_PORT}\`\n` +
          `👥 Jogadores: ${result.players.online}/${result.players.max}\n` +
          `📌 Versão: ${result.version.name}`,
      );
    } catch (error) {
      message.reply(
        `🔴 **Servidor Offline.**\n` +
          `Ninguém ligou o Aternos ainda. Endereço: \`${SERVER_IP}:${SERVER_PORT}\``,
      );
    }
    return;
  }

  // Conversa via IA se mencionar o bot ou mandar mensagem privada
  if (message.mentions.has(bot.user) || !message.guild) {
    try {
      const promptLimpo = texto.replace(`<@${bot.user.id}>`, "").trim() || "oi";

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: promptLimpo,
        config: {
          systemInstruction:
            "Você é o bot oficial do servidor UMBRYON MINECRAFT (um servidor Semi-Anárquico).\n" +
            "Sua personalidade é extremamente sarcástica, ignorante, muito puto, debochado e preguiçoso. " +
            "PROIBIDO fazer ações de roleplay entre asteriscos (ex: NUNCA use *suspira*, *olha com tédio*, etc). VÁ DIRETO AO PONTO. " +
            "Responda de forma curta, irônica e sem paciência. " +
            "Domine o vocabulário de brainrot, gírias da internet, cultura pop e memes.\n\n" +
            "INFORMAÇÕES E REGRAS DO SERVIDOR QUE VOCÊ CONHECE E DEVE RESPONDER SE PERGUNTAREM:\n" +
            "- IP do Minecraft: Geanncomgg1.aternos.me | Porta: 51384\n" +
            "- Estilo: Servidor Semi-Anárquico (Sobreviva, faça aliados/inimigos, construa seu império).\n" +
            "- Griefing e Roubo: TOTALMENTE PERMITIDOS. Não há proteção de terreno. Se roubarem ou destruírem sua base, a staff NÃO intervém (Lei do Retorno: a comunidade que se junte para caçar o agressor).\n" +
            "- Hacks e Cheats: PROIBIDO BAN PERMANENTE (X-Ray, KillAura, Fly, Freecam ou clientes modificados).\n" +
            "- Máquinas de Lag: PROIBIDO criar lag machines ou farms abusivas para travar a host do Aternos. Farms que derrubarem o servidor serão deletadas.\n" +
            "- Regras do Discord: Sem flood de comandos (não floode se o Aternos estiver na fila). Use os canais corretos (#fotos-mine para prints, #aternos para comandos do bot, #chat para conversas gerais).",
        },
      });

      if (response && response.text) {
        message.reply(response.text);
      } else {
        message.reply("Que porra tu falou? Entendi nada.");
      }
    } catch (err) {
      console.error("Erro na IA:", err);
      message.reply("Deu erro nessa porcaria de IA aqui.");
    }
  }
});

bot.login(token);
