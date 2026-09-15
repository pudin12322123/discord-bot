import { Client, Events, GatewayIntentBits, ActivityType } from "discord.js";
import { GoogleGenAI } from "@google/genai";
import util from "minecraft-server-util";
import http from "http";

// Servidor Web Keep-Alive na porta 3000
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
  console.error("Token do Discord não encontrado.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: aiKey });

// DADOS DO ATERNOS (Usa o IP Dinâmico para a biblioteca não ser bloqueada)
const DISPLAY_IP = "Geanncomgg1.aternos.me";
const DYN_IP = "escolar.aternos.host";
const SERVER_PORT = 51384;

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ==========================================
// FUNÇÃO DE STATUS COM IP DINÂMICO
// ==========================================
async function checkMinecraftStatus() {
  // 1. Tenta ping usando o IP Dinâmico na porta específica
  try {
    const result = await util.status(DYN_IP, Number(SERVER_PORT), { timeout: 4000 });
    return {
      online: true,
      players: result.players.online,
      maxPlayers: result.players.max,
      version: result.version.name,
    };
  } catch (error) {
    // 2. Fallback para Bedrock/Geyser no IP Dinâmico
    try {
      const bedrockResult = await util.statusBedrock(DYN_IP, { port: Number(SERVER_PORT), timeout: 4000 });
      return {
        online: true,
        players: bedrockResult.players.online,
        maxPlayers: bedrockResult.players.max,
        version: bedrockResult.version.name,
      };
    } catch (err) {
      // 3. Tentativa final com o IP normal
      try {
        const fallbackResult = await util.status(DISPLAY_IP, Number(SERVER_PORT), { timeout: 4000 });
        return {
          online: true,
          players: fallbackResult.players.online,
          maxPlayers: fallbackResult.players.max,
          version: fallbackResult.version.name,
        };
      } catch (e3) {
        return { online: false, players: 0, maxPlayers: 0, version: "Desconhecida" };
      }
    }
  }
}

// ==========================================
// EVENTO READY + ATUALIZAÇÃO AUTOMÁTICA
// ==========================================
bot.once(Events.ClientReady, (client) => {
  console.log(`🤖 Bot online com IA Gemini: ${client.user.tag}`);

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

  // 1. COMANDO DIRETO !status
  if (textoLower === "!status") {
    try {
      await message.channel.sendTyping();
      const result = await checkMinecraftStatus();

      if (result.online) {
        return message.reply(
          `🟢 **UMBRYON MINECRAFT ONLINE!**\n` +
            `🌐 IP: \`${DISPLAY_IP}\` | Porta: \`${SERVER_PORT}\`\n` +
            `👥 Jogadores: ${result.players.online}/${result.players.max}\n` +
            `📌 Versão: ${result.version}`,
        );
      } else {
        return message.reply(
          `🔴 **Servidor Offline ou Iniciando.**\n` +
            `O Aternos está desligado no momento. IP: \`${DISPLAY_IP}:${SERVER_PORT}\``,
        );
      }
    } catch (e) {
      console.error("Erro no comando status:", e);
      return message.reply("Deu erro ao consultar o servidor de Minecraft.");
    }
  }

  // 2. VERIFICA SE A MENSAGEM É UMA RESPOSTA AO BOT
  let isReplyToBot = false;
  if (message.reference && message.reference.messageId) {
    try {
      const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
      if (referencedMessage.author.id === bot.user.id) {
        isReplyToBot = true;
      }
    } catch (e) {}
  }

  // 3. CONVERSA VIA IA GEMINI
  const isAskedAboutServer =
    textoLower.includes("sv ta on") ||
    textoLower.includes("server ta on") ||
    textoLower.includes("servidor esta on") ||
    textoLower.includes("servidor ta ligado") ||
    textoLower.includes("ta aberto") ||
    textoLower.includes("ta ligado") ||
    textoLower.includes("tem alguem jogando");

  const shouldRespond =
    message.mentions.has(bot.user) ||
    !message.guild ||
    isAskedAboutServer ||
    isReplyToBot;

  if (shouldRespond) {
    try {
      await message.channel.sendTyping();

      const regexBotMention = new RegExp(`<@!?${bot.user.id}>`, "g");
      let promptLimpo = texto.replace(regexBotMention, "").trim();

      if (!promptLimpo) promptLimpo = "fala aí";

      const currentStatus = await checkMinecraftStatus();
      
      const statusContext = currentStatus.online
        ? `[DADO REAL OBRIGATÓRIO: O SERVIDOR ESTÁ LIGADO/ONLINE AGORA! Jogadores conectados: ${currentStatus.players}/${currentStatus.maxPlayers}. IP: ${DISPLAY_IP}:${SERVER_PORT}]`
        : `[DADO REAL OBRIGATÓRIO: O SERVIDOR ESTÁ DESLIGADO/OFFLINE AGORA NO ATERNOS!]`;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash", // Modelo correto e estável
        contents: promptLimpo,
        config: {
          systemInstruction:
            "Seu nome é Umbryon Bot (atende por Umbryon, Umbry, Bot do Umbryon).\n" +
            "Você é o bot oficial do servidor UMBRYON MINECRAFT (um servidor Anárquico).\n" +
            "Sua personalidade é extremamente sarcástica, ignorante, muito puto, debochado e preguiçoso. " +
            "USE E ABUSE de gírias brainrot e shitpost (ex: skibidi, sigma, rizz, gyat, mewing, fanum tax, NPC, yapping, intankável, absolute cinema, redpill, based).\n" +
            "PROIBIDO mandar o usuário entrar pra olhar o servidor se ele perguntar do status. Diga diretamente se tá LIGADO ou DESLIGADO usando o DADO REAL fornecido, mas do seu jeito ignorante/brainrot.\n" +
            "PROIBIDO fazer ações de roleplay entre asteriscos (NUNCA use *suspira*, *olha com tédio*, etc). VÁ DIRETO AO PONTO.\n\n" +
            `${statusContext}\n\n` +
            "REGRAS E DADOS DO SERVIDOR:\n" +
            "- IP: Geanncomgg1.aternos.me | Porta: 51384\n" +
            "- Estilo: Servidor Anárquico.\n" +
            "- Griefing e Roubo: TOTALMENTE PERMITIDOS. Sem proteção de terreno. Perdeu a base? Skill issue, chora mais.\n" +
            "- Hacks e Cheats: TOTALMENTE PERMITIDOS (X-Ray, KillAura, Fly, hack client). É terra sem lei.\n" +
            "- Máquinas de Lag: ÚNICA COISA PROIBIDA. Não crie lag machines para travar o Aternos.\n" +
            "- Regras do Discord: Sem flood de comandos. Usem os canais certos (#fotos-mine, #aternos, #chat).",
        },
      });

      if (response && response.text) {
        message.reply(response.text);
      } else {
        message.reply("Cala a boca aí, deu erro no meu cérebro.");
      }
    } catch (err) {
      console.error("Erro na IA:", err);
      if (err.toString().includes("429") || err.toString().includes("quota")) {
        return message.reply("Cansaço da porra, gastei todas as minhas respostas do Gemini por hoje. Usa `!status` pra ver o servidor.");
      }
      message.reply("Deu ruim na IA, tenta de novo.");
    }
  }
});

bot.login(token);
