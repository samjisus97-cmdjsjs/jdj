const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

// 🔐 Tu token de bot
const token = '8120700002:AAEhbtQgvyr0S2kSLQi8xd7szDHaOb5tvs8';
const bot = new TelegramBot(token, { polling: true });

// 🧠 Lista de user agents para evitar bloqueos
const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/117.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15A372 Safari/604.1"
];

// 📥 Comando /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, '👋 Envíame un link como:\n\n`https://jkanime.net/serie/1/`\n\nBuscaré todos los capítulos y te mandaré los enlaces `.m3u8`.', { parse_mode: 'Markdown' });
});

// 🧠 Recibir link y empezar análisis
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text.startsWith('/')) return;

  if (!/\/\d+\/?$/.test(text)) {
    bot.sendMessage(chatId, '❌ El link debe terminar en `/1/`, `/2/`, etc.');
    return;
  }

  bot.sendMessage(chatId, '🔍 Buscando enlaces capítulo por capítulo...');
  const resultados = await buscarLinks(text, chatId);

  if (resultados.length > 0) {
    for (const r of resultados) {
      await bot.sendMessage(chatId, `🎬 Capítulo ${r.capitulo}:\n${r.enlace}`);
    }
    bot.sendMessage(chatId, `✅ Se encontraron ${resultados.length} capítulos con enlaces.`);
  } else {
    bot.sendMessage(chatId, '⚠️ No se encontró ningún enlace `.m3u8`.');
  }
});

// 🚀 Función principal
async function buscarLinks(urlBase, chatId) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const resultados = [];
  let capitulo = 1;

  const cleanBase = urlBase.replace(/\/\d+\/?$/, '');

  while (true) {
    const url = `${cleanBase}/${capitulo}/`;
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

    await bot.sendMessage(chatId, `🔄 Capítulo ${capitulo}... Esperando 10s`);
    console.log(`⏳ Esperando antes de entrar al capítulo ${capitulo}`);
    await new Promise(res => setTimeout(res, 10000));

    const page = await browser.newPage();
    await page.setUserAgent(userAgent);

    const enlacesM3U8 = new Set();

    page.on('request', (req) => {
      if (req.url().includes('.m3u8')) {
        enlacesM3U8.add(req.url());
      }
    });

    try {
      console.log(`🌐 Navegando a: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });

      await new Promise(res => setTimeout(res, 15000)); // espera por si hay reproductor
    } catch (e) {
      console.log(`❌ Error en capítulo ${capitulo}: ${e.message}`);
    }

    await page.close();

    if (enlacesM3U8.size === 0) {
      console.log(`🛑 No se encontró enlace en capítulo ${capitulo}`);
      break;
    }

    resultados.push({
      capitulo,
      enlace: Array.from(enlacesM3U8)[0]
    });

    capitulo++;
  }

  await browser.close();
  return resultados;
}

