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
const SERVER_IP = "Geanncomgg1.aternos.me";
const SERVER_PORT = 51384; // Garantido como Number

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
    // Tenta consulta Java padrão (Timeout curto para não travar o bot)
    const result = await util.status(SERVER_IP, Number(SERVER_PORT), { timeout: 3000 });
    return {
      online: true,
      players: result.players.online,
      maxPlayers: result.players.max,
      version: result.version.name,
    };
  } catch (error) {
    try {
      // Fallback para Bedrock/Geyser
      const bedrockResult = await util.statusBedrock(SERVER_IP, { port: Number(SERVER_PORT), timeout: 3000 });
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

  // Atualiza o status do bot no Discord a cada 2 minutos
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

  // 1. COMANDO DIRETO !status (Roda separado e direto)
  if (textoLower === "!status") {
    try {
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
          `🔴 **Servidor Offline ou Iniciando.**\n` +
            `O Aternos está desligado no momento. IP: \`${SERVER_IP}:${SERVER_PORT}\``,
        );
      }
    } catch (e) {
      console.error("Erro no comando status:", e);
      return message.reply("Deu erro ao consultar o servidor de Minecraft.");
    }
  }

  // 2. CONVERSA VIA IA GEMINI
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

      // Pega o status do servidor para dar de contexto pra IA
      const currentStatus = await checkMinecraftStatus();
      const statusContext = currentStatus.online
        ? `[DADOS DO MINECRAFT AGORA: SERVIDOR ONLINE! Jogadores: ${currentStatus.players}/${currentStatus.maxPlayers}. IP: ${SERVER_IP}:${SERVER_PORT}]`
        : `[DADOS DO MINECRAFT AGORA: SERVIDOR OFFLINE NO ATERNOS.]`;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash", // Nome correto e estável do modelo
        contents: promptLimpo,
        config: {
          systemInstruction:
            "Seu nome é Umbryon Bot (atende por Umbryon, Umbry, Bot do Umbryon).\n" +
            "Você é o bot oficial do servidor UMBRYON MINECRAFT (um servidor Anárquico).\n" +
            "Sua personalidade é extremamente sarcástica, ignorante, muito puto, debochado e preguiçoso. " +
            "USE E ABUSE de gírias brainrot e shitpost (ex: skibidi, sigma, rizz, gyat, mewing, fanum tax, NPC, yapping, intankável, absolute cinema, redpill, based). " +
            "Se alguém falar abobrinha, mande parar de 'yapping' ou chame de 'NPC'.\n" +
            "PROIBIDO fazer ações de roleplay entre asteriscos (NUNCA use *suspira*, *olha com tédio*, etc). VÁ DIRETO AO PONTO. " +
            "Responda de forma curta, irônica e sem nenhuma paciência.\n\n" +
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
        message.reply("Cala a boca aí, deu erro aqui.");
      }
    } catch (err) {
      console.error("Erro na IA:", err);
      message.reply("Deu ruim na IA, tenta de novo.");
    }
  }
});

bot.login(token);
