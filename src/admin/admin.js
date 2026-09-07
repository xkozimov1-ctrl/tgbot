const { t } = require('../middlewares/i18n');
const { getStats, addMovie } = require('../services/supabase');

const ADMIN_IDS = process.env.ADMIN_IDS.split(',').map(id => Number(id.trim()));

function isAdmin(userId) {
  return ADMIN_IDS.includes(userId);
}

// /stats buyrug'i
async function handleStats(ctx) {
  if (!isAdmin(ctx.from.id)) {
    return ctx.reply(t(ctx.from.id, 'admin_only'));
  }
  
  const stats = await getStats();
  ctx.reply(t(ctx.from.id, 'stats', {
    users: stats.users || 0,
    movies: stats.movies || 0,
    queries: stats.queries || 0
  }));
}

// /add_movie - admin kino qo'shishi uchun
async function handleAddMovie(ctx) {
  if (!isAdmin(ctx.from.id)) {
    return ctx.reply(t(ctx.from.id, 'admin_only'));
  }
  
  // Masalan: /add_movie Naruto|2002|8.5|Anime haqida|file_id
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 1) {
    return ctx.reply('❌ Format: /add_movie Title|Year|Rating|Description|file_id');
  }
  
  const [title, year, rating, description, fileId] = args[0].split('|');
  const result = await addMovie(title, parseInt(year), parseFloat(rating), description, fileId);
  
  if (result.error) {
    ctx.reply(`❌ Xatolik: ${result.error.message}`);
  } else {
    ctx.reply(`✅ "${title}" muvaffaqiyatli qo'shildi!`);
  }
}

module.exports = { isAdmin, handleStats, handleAddMovie };