require('dotenv').config();
const { Telegraf, session, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

// ============================================
// 1. SUPABASE ULASH
// ============================================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ============================================
// 2. ADMIN IDS
// ============================================
const ADMIN_IDS = process.env.ADMIN_IDS.split(',').map(id => Number(id.trim()));

function isAdmin(userId) {
  return ADMIN_IDS.includes(Number(userId));
}

// ============================================
// 3. TARJIMALAR (O'zbek, Rus, Ingliz)
// ============================================
const LANGUAGES = {
  uz: {
    welcome: "Assalomu alaykum! 👋 BMT Anime botiga xush kelibsiz!",
    search_prompt: "✍️ Kino yoki anime nomini kiriting:",
    not_found: "❌ Hech narsa topilmadi. Boshqa nom bilan urinib ko'ring.",
    language_changed: "✅ Til o'zgartirildi! 🇺🇿",
    choose_language: "🌐 Tilni tanlang:",
    admin_only: "⛔ Bu buyruq faqat adminlar uchun!",
    stats: "📊 Statistika:\n👥 Foydalanuvchilar: {users}\n🎬 Kinolar: {movies}\n📝 Qidiruvlar: {searches}",
    movie_info: "🎬 *{title}*\n📅 Yil: {year}\n⭐ Reyting: {rating}\n📝 {description}",
    error: "⚠️ Xatolik yuz berdi. Qayta urinib ko'ring."
  },
  ru: {
    welcome: "Привет! 👋 Добро пожаловать в BMT Anime бот!",
    search_prompt: "✍️ Введите название фильма или аниме:",
    not_found: "❌ Ничего не найдено. Попробуйте другое название.",
    language_changed: "✅ Язык изменён! 🇷🇺",
    choose_language: "🌐 Выберите язык:",
    admin_only: "⛔ Эта команда только для администраторов!",
    stats: "📊 Статистика:\n👥 Пользователей: {users}\n🎬 Фильмов: {movies}\n📝 Запросов: {searches}",
    movie_info: "🎬 *{title}*\n📅 Год: {year}\n⭐ Рейтинг: {rating}\n📝 {description}",
    error: "⚠️ Произошла ошибка. Попробуйте снова."
  },
  en: {
    welcome: "Hello! 👋 Welcome to BMT Anime bot!",
    search_prompt: "✍️ Enter movie or anime name:",
    not_found: "❌ Nothing found. Try another name.",
    language_changed: "✅ Language changed! 🇬🇧",
    choose_language: "🌐 Choose a language:",
    admin_only: "⛔ This command is for admins only!",
    stats: "📊 Stats:\n👥 Users: {users}\n🎬 Movies: {movies}\n📝 Searches: {searches}",
    movie_info: "🎬 *{title}*\n📅 Year: {year}\n⭐ Rating: {rating}\n📝 {description}",
    error: "⚠️ An error occurred. Please try again."
  }
};

// Foydalanuvchi tilini saqlash
const userLang = new Map();

function getLang(userId) {
  return userLang.get(userId) || 'uz';
}

function setLang(userId, lang) {
  if (LANGUAGES[lang]) {
    userLang.set(userId, lang);
    return true;
  }
  return false;
}

function t(userId, key, params = {}) {
  const lang = getLang(userId);
  let text = LANGUAGES[lang][key] || LANGUAGES['uz'][key] || key;
  Object.keys(params).forEach(k => {
    text = text.replace(new RegExp(`{${k}}`, 'g'), params[k]);
  });
  return text;
}

// ============================================
// 4. SUPABASE FUNKSIYALARI
// ============================================

// Foydalanuvchini saqlash
async function saveUser(telegramId, username) {
  const { error } = await supabase
    .from('users')
    .upsert({ telegram_id: telegramId, username: username })
    .select();
  return { error };
}

// Kino qidirish
async function searchMovies(query) {
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .ilike('title', `%${query}%`)
    .order('views', { ascending: false })
    .limit(10);
  return { data, error };
}

// Kino qo'shish (admin)
async function addMovie(title, year, rating, description, fileId, type = 'anime', genre = []) {
  const { data, error } = await supabase
    .from('movies')
    .insert([{ title, year, rating, description, file_id: fileId, type, genre }])
    .select();
  return { data, error };
}

// Kino o'chirish (admin)
async function deleteMovie(title) {
  const { data, error } = await supabase
    .from('movies')
    .delete()
    .ilike('title', `%${title}%`)
    .select();
  return { data, error };
}

// Statistika olish
async function getStats() {
  const { count: users } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  
  const { count: movies } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true });
  
  const { count: searches } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  
  return { users: users || 0, movies: movies || 0, searches: searches || 0 };
}

// Kino ko'rishlar sonini oshirish
async function incrementViews(movieId) {
  const { error } = await supabase.rpc('increment_movie_views', { movie_id: movieId });
  if (error) {
    // Agar RPC funksiyasi bo'lmasa, oddiy update
    await supabase
      .from('movies')
      .update({ views: supabase.raw('views + 1') })
      .eq('id', movieId);
  }
}

// ============================================
// 5. BOTNI YARATISH
// ============================================
const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());

// ============================================
// 6. BUYRUQLAR
// ============================================

// /start - Boshlash
bot.command('start', async (ctx) => {
  const userId = ctx.from.id;
  await saveUser(userId, ctx.from.username || '');
  
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🇺🇿 O\'zbek', 'lang_uz')],
    [Markup.button.callback('🇷🇺 Русский', 'lang_ru')],
    [Markup.button.callback('🇬🇧 English', 'lang_en')]
  ]);
  
  const menu = Markup.keyboard([
    ['🔍 Kino izlash', '🌐 Til'],
    ['📊 Ommabop', '❓ Yordam']
  ]).resize();
  
  await ctx.reply(t(userId, 'welcome'), keyboard);
  await ctx.reply('🏠 Asosiy menyu:', menu);
});

// /help - Yordam
bot.command('help', async (ctx) => {
  const userId = ctx.from.id;
  ctx.reply(`
📖 **Yordam**

🔍 Kino izlash - nom yozing yoki tugmani bosing
🌐 Tilni o'zgartirish - Til tugmasini bosing
📊 Ommabop kinolar - Ommabop tugmasini bosing

👑 Admin buyruqlari:
/stats - Statistika
/add_movie - Kino qo'shish
/delete_movie - Kino o'chirish
  `, { parse_mode: 'Markdown' });
});

// /about - Bot haqida
bot.command('about', async (ctx) => {
  ctx.reply(`
ℹ️ **BMT Anime Bot v1.0**

🎬 Anime va kinolarni qidirish uchun bot
🌍 3 til: O'zbek, Rus, Ingliz
🤖 Node.js + Telegraf + Supabase
  `, { parse_mode: 'Markdown' });
});

// /stats - Statistika (faqat admin)
bot.command('stats', async (ctx) => {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) {
    return ctx.reply(t(userId, 'admin_only'));
  }
  
  const stats = await getStats();
  ctx.reply(t(userId, 'stats', {
    users: stats.users,
    movies: stats.movies,
    searches: stats.searches
  }));
});

// /add_movie - Kino qo'shish (faqat admin)
bot.command('add_movie', async (ctx) => {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) {
    return ctx.reply(t(userId, 'admin_only'));
  }
  
  const args = ctx.message.text.split(' ');
  args.shift();
  
  if (args.length === 0) {
    return ctx.reply(`
📝 **Format:**
\`/add_movie Title|Year|Rating|Description|FileID|type|genre\`

**Misol:**
\`/add_movie Naruto|2002|8.5|Naruto haqida|BA...|anime|Action,Adventure\`
    `, { parse_mode: 'Markdown' });
  }
  
  try {
    const parts = args[0].split('|');
    const result = await addMovie(
      parts[0]?.trim(),
      parts[1] ? parseInt(parts[1]) : null,
      parts[2] ? parseFloat(parts[2]) : null,
      parts[3]?.trim() || '',
      parts[4]?.trim(),
      parts[5]?.trim() || 'anime',
      parts[6] ? parts[6].split(',').map(g => g.trim()) : []
    );
    
    if (result.error) {
      return ctx.reply(`❌ Xatolik: ${result.error.message}`);
    }
    
    ctx.reply(`✅ "${parts[0]}" qo'shildi!`);
  } catch (error) {
    ctx.reply('❌ Xatolik yuz berdi');
  }
});

// /delete_movie - Kino o'chirish (faqat admin)
bot.command('delete_movie', async (ctx) => {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) {
    return ctx.reply(t(userId, 'admin_only'));
  }
  
  const args = ctx.message.text.split(' ');
  args.shift();
  
  if (args.length === 0) {
    return ctx.reply('📝 Format: `/delete_movie Kino_nomi`', { parse_mode: 'Markdown' });
  }
  
  const query = args.join(' ');
  const result = await deleteMovie(query);
  
  if (result.error || !result.data || result.data.length === 0) {
    return ctx.reply(`❌ "${query}" topilmadi`);
  }
  
  ctx.reply(`✅ "${query}" o'chirildi!`);
});

// ============================================
// 7. TUGMALAR
// ============================================

// Til tanlash
bot.action(/lang_(.+)/, async (ctx) => {
  const lang = ctx.match[1];
  const userId = ctx.from.id;
  
  setLang(userId, lang);
  await ctx.answerCbQuery(`✅ ${lang.toUpperCase()}`);
  ctx.reply(t(userId, 'language_changed'));
});

// "Kino izlash" tugmasi
bot.hears('🔍 Kino izlash', async (ctx) => {
  ctx.reply(t(ctx.from.id, 'search_prompt'));
});

// "Til" tugmasi
bot.hears('🌐 Til', async (ctx) => {
  const userId = ctx.from.id;
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🇺🇿 O\'zbek', 'lang_uz')],
    [Markup.button.callback('🇷🇺 Русский', 'lang_ru')],
    [Markup.button.callback('🇬🇧 English', 'lang_en')]
  ]);
  ctx.reply(t(userId, 'choose_language'), keyboard);
});

// "Ommabop" tugmasi
bot.hears('📊 Ommabop', async (ctx) => {
  const userId = ctx.from.id;
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .order('views', { ascending: false })
    .limit(5);
  
  if (error || !data || data.length === 0) {
    return ctx.reply('❌ Hozircha ommabop kinolar yo\'q');
  }
  
  let message = '🔥 **OMMABOP KINOLAR**\n\n';
  data.forEach((m, i) => {
    message += `${i+1}. *${m.title}* (${m.year || 'N/A'})\n`;
    message += `   ⭐ ${m.rating || 'N/A'} | 👁️ ${m.views || 0}\n\n`;
  });
  
  ctx.reply(message, { parse_mode: 'Markdown' });
});

// "Yordam" tugmasi
bot.hears('❓ Yordam', async (ctx) => {
  ctx.reply(`
📖 **Yordam**

🔍 Kino izlash - nom yozing
🌐 Tilni o'zgartirish - Til tugmasi
📊 Ommabop kinolar - Ommabop tugmasi
  `);
});

// ============================================
// 8. MATNLI XABAR (KINO QIDIRISH)
// ============================================
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const query = ctx.message.text.trim();
  
  // Tugmalarni ignore
  if (['🔍 Kino izlash', '🌐 Til', '📊 Ommabop', '❓ Yordam'].includes(query)) {
    return;
  }
  
  if (query.length < 2) return;
  
  const { data, error } = await searchMovies(query);
  
  if (error || !data || data.length === 0) {
    return ctx.reply(t(userId, 'not_found'));
  }
  
  for (const movie of data) {
    const info = t(userId, 'movie_info', {
      title: movie.title,
      year: movie.year || 'N/A',
      rating: movie.rating || 'N/A',
      description: (movie.description || '').substring(0, 150) + '...'
    });
    
    try {
      await ctx.replyWithVideo(movie.file_id, {
        caption: info,
        parse_mode: 'Markdown'
      });
      // Ko'rishlar sonini oshirish
      await incrementViews(movie.id);
    } catch (videoError) {
      await ctx.reply(info, { parse_mode: 'Markdown' });
    }
  }
});

// ============================================
// 9. XATOLIK
// ============================================
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  try {
    ctx.reply('⚠️ Xatolik yuz berdi. Qayta urinib ko\'ring.');
  } catch (e) {}
});

// ============================================
// 10. BOTNI ISHGA TUSHIRISH
// ============================================
async function startBot() {
  try {
    await bot.telegram.setWebhook('');
    await bot.launch({ dropPendingUpdates: true });
    console.log('✅ Bot ishga tushdi!');
    const info = await bot.telegram.getMe();
    console.log(`📊 @${info.username} | ID: ${info.id}`);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

startBot();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));