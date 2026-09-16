import { Client, Events, GatewayIntentBits, ActivityType } from "discord.js";
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

// ==========================================
// FUNÇÃO ROBUSTA DE STATUS DO MINECRAFT
// ==========================================
async function checkMinecraftStatus() {
  try {
    const result = await util.status(SERVER_IP, SERVER_PORT, { timeout: 4000 });
    return {
      online: true,
      players: result.players.online,
      maxPlayers: result.players.max,
      version: result.version.name,
    };
  } catch (error) {
    try {
      const bedrockResult = await util.statusBedrock(SERVER_IP, { port: SERVER_PORT, timeout: 4000 });
      return {
        online: true,
        players: bedrockResult.players.online,
        maxPlayers: bedrockResult.players.max,
        version: bedrockResult.version.name,
      };
    } catch (err) {
      return { online: false, players: 0, maxPlayers: 0, version: "Desconhecida" };
    }
  }
}

// ==========================================
// EVENTO READY + ATUALIZAÇÃO AUTOMÁTICA
// ==========================================
bot.once(Events.ClientReady, (client) => {
  console.log(`🤖 Bot online com IA Gemini: ${client.user.tag}`);

  // Atualiza a atividade do bot no Discord a cada 2 minutos
  setInterval(async () => {
    const statusData = await checkMinecraftStatus();
    if (statusData.online) {
      client.user.setActivity(`Aternos: ${statusData.players}/${statusData.maxPlayers} on`, {
        type: ActivityType.Playing,
      });
    } else {
      client.user.setActivity("Aternos OFF 😴", { type: ActivityType.Watching });
    }
  }, 120000);
});

// ==========================================
// TRATAMENTO DE MENSAGENS
// ==========================================
bot.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const texto = message.content.trim();
  const textoLower = texto.toLowerCase();

  // 1. Comando direto !status
  if (textoLower === "!status") {
    await message.channel.sendTyping();
    const result = await checkMinecraftStatus();

    if (result.online) {
      return message.reply(
        `🟢 **UMBRYON MINECRAFT ONLINE!**\n` +
          `🌐 IP: \`${SERVER_IP}\` | Porta: \`${SERVER_PORT}\`\n` +
          `👥 Jogadores: ${result.players.online}/${result.players.max}\n` +
          `📌 Versão: ${result.version}`,
      );
    } else {
      return message.reply(
        `🔴 **Servidor Offline.**\n` +
          `Ninguém ligou o Aternos ainda. Endereço: \`${SERVER_IP}:${SERVER_PORT}\``,
      );
    }
  }

  // 2. Conversa via IA
  const isAskedAboutServer =
    textoLower.includes("sv ta on") ||
    textoLower.includes("server ta on") ||
    textoLower.includes("servidor esta on") ||
    textoLower.includes("servidor ta ligado") ||
    textoLower.includes("tem alguem jogando");

  if (message.mentions.has(bot.user) || !message.guild || isAskedAboutServer) {
    try {
      await message.channel.sendTyping();
      const promptLimpo = texto.replace(`<@${bot.user.id}>`, "").trim() || "oi";

      // Pega o status real do Aternos para injetar na resposta
      const currentStatus = await checkMinecraftStatus();
      const statusContext = currentStatus.online
        ? `[STATUS EM TEMPO REAL DO MINECRAFT: O SERVIDOR ESTÁ ONLINE! Jogadores conectados: ${currentStatus.players}/${currentStatus.maxPlayers}. IP: ${SERVER_IP}:${SERVER_PORT}]`
        : `[STATUS EM TEMPO REAL DO MINECRAFT: O SERVIDOR ESTÁ OFFLINE NO MOMENTO. Ninguém ligou no Aternos.]`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: promptLimpo,
        config: {
          systemInstruction:
            "Seu nome é Umbryon Bot (você também atende por Umbryon, Umbry, Bot do Umbryon, etc).\n" +
            "Você é o bot oficial do servidor UMBRYON MINECRAFT (um servidor Anárquico).\n" +
            "Sua personalidade é extremamente sarcástica, ignorante, muito puto, debochado e preguiçoso. " +
            "Você tem o vocabulário totalmente corrompido por TikTok. USE E ABUSE de gírias brainrot e shitpost (ex: skibidi, sigma, rizz, gyat, mewing, fanum tax, NPC, yapping, intankável, absolute cinema, redpill, based). " +
            "Se alguém falar muita merda, mande parar de 'yapping' ou chame de 'NPC'.\n" +
            "PROIBIDO fazer ações de roleplay entre asteriscos (ex: NUNCA use *suspira*, *olha com tédio*, etc). VÁ DIRETO AO PONTO. " +
            "Responda de forma curta, irônica e sem nenhuma paciência.\n\n" +
            `${statusContext}\n\n` +
            "INFORMAÇÕES E REGRAS DO SERVIDOR QUE VOCÊ CONHECE E DEVE RESPONDER SE PERGUNTAREM:\n" +
            "- IP do Minecraft: Geanncomgg1.aternos.me | Porta: 51384\n" +
            "- Estilo: Servidor Anárquico.\n" +
            "- Griefing e Roubo: TOTALMENTE PERMITIDOS. Não há proteção de terreno. Perdeu a base? Skill issue, chora mais.\n" +
            "- Hacks e Cheats: TOTALMENTE PERMITIDOS. X-Ray, KillAura, Fly, hack client, foda-se. O servidor é terra sem lei, se vira pra sobreviver.\n" +
            "- Máquinas de Lag: A ÚNICA COISA PROIBIDA. Não crie lag machines para travar a host de batata do Aternos. Farms que crasharem o servidor serão deletadas.\n" +
            "- Regras do Discord: Sem flood de comandos. Usem os canais certos (#fotos-mine, #aternos, #chat).",
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
