const { ADMIN_IDS } = require('../bot');
const { 
  getStats, 
  addMovie, 
  deleteMovie, 
  getAllMovies,
  getAllUsers,
  getMovieStats 
} = require('../services/supabase');
const { t, getLanguage } = require('../middlewares/i18n');

// ============================================
// ADMIN TEKSHIRISH
// ============================================
function isAdmin(userId) {
  return ADMIN_IDS.includes(Number(userId));
}

// ============================================
// /stats - STATISTIKA
// ============================================
async function handleStats(ctx) {
  const userId = ctx.from.id;
  
  if (!isAdmin(userId)) {
    return ctx.reply(t(userId, 'admin_only'));
  }
  
  try {
    const stats = await getStats();
    const movieStats = await getMovieStats();
    
    const message = `
📊 **BOT STATISTIKASI**

👥 **Foydalanuvchilar:** ${stats.users || 0}
🎬 **Jami kinolar:** ${stats.movies || 0}
  └─ Anime: ${movieStats.anime || 0}
  └─ Filmlar: ${movieStats.films || 0}
🔍 **Qidiruvlar:** ${stats.searches || 0}
📅 **Bugungi foydalanuvchilar:** ${stats.todayUsers || 0}

📈 **Eng ko'p qidirilganlar:**
${stats.topQueries && stats.topQueries.length > 0 
  ? stats.topQueries.map(q => `  • ${q.query} (${q.results_count} natija)`).join('\n')
  : '  • Hali ma\'lumot yo\'q'
}
    `;
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Stats error:', error);
    ctx.reply('❌ Statistikani olishda xatolik yuz berdi.');
  }
}

// ============================================
// /add_movie - KINO QO'SHISH
// ============================================
async function handleAddMovie(ctx) {
  const userId = ctx.from.id;
  
  if (!isAdmin(userId)) {
    return ctx.reply(t(userId, 'admin_only'));
  }
  
  const args = ctx.message.text.split(' ');
  args.shift(); // /add_movie ni olib tashlash
  
  if (args.length === 0) {
    return ctx.reply(`
📝 **Kino qo'shish formati:**

\`/add_movie Title|Year|Rating|Description|FileID|type|genre\`

**Misol:**
\`/add_movie Naruto|2002|8.5|Naruto haqida|BA...|anime|Action,Adventure\`

**Izoh:**
• Title - kino nomi (majburiy)
• Year - yil (ixtiyoriy)
• Rating - reyting (ixtiyoriy)
• Description - tavsif (ixtiyoriy)
• FileID - Telegram file ID (majburiy)
• type - anime yoki film (default: anime)
• genre - janr (ixtiyoriy, vergul bilan)
    `, { parse_mode: 'Markdown' });
  }
  
  try {
    const parts = args[0].split('|');
    const movieData = {
      title: parts[0]?.trim(),
      year: parts[1] ? parseInt(parts[1]) : null,
      rating: parts[2] ? parseFloat(parts[2]) : null,
      description: parts[3]?.trim() || '',
      file_id: parts[4]?.trim(),
      type: parts[5]?.trim() || 'anime',
      genre: parts[6] ? parts[6].split(',').map(g => g.trim()) : []
    };
    
    if (!movieData.title || !movieData.file_id) {
      return ctx.reply('❌ Kino nomi va File ID majburiy!');
    }
    
    const result = await addMovie(movieData);
    
    if (result.error) {
      return ctx.reply(`❌ Xatolik: ${result.error.message}`);
    }
    
    await ctx.reply(`
✅ **"${movieData.title}" muvaffaqiyatli qo'shildi!**

📋 Ma'lumotlar:
• Nomi: ${movieData.title}
• Yil: ${movieData.year || 'N/A'}
• Reyting: ${movieData.rating || 'N/A'}
• Turi: ${movieData.type}
• Janr: ${movieData.genre.join(', ') || 'N/A'}
    `, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Add movie error:', error);
    ctx.reply('❌ Kino qo\'shishda xatolik yuz berdi.');
  }
}

// ============================================
// /delete_movie - KINO O'CHIRISH
// ============================================
async function handleDeleteMovie(ctx) {
  const userId = ctx.from.id;
  
  if (!isAdmin(userId)) {
    return ctx.reply(t(userId, 'admin_only'));
  }
  
  const args = ctx.message.text.split(' ');
  args.shift();
  
  if (args.length === 0) {
    return ctx.reply(`
📝 **Kino o'chirish formati:**
\`/delete_movie Kino_nomi\`

**Misol:**
\`/delete_movie Naruto\`
    `, { parse_mode: 'Markdown' });
  }
  
  try {
    const query = args.join(' ');
    const { data: movies, error } = await getAllMovies(1, 5);
    
    if (error || !movies || movies.length === 0) {
      return ctx.reply('❌ Kino topilmadi!');
    }
    
    const movie = movies.find(m => 
      m.title.toLowerCase().includes(query.toLowerCase())
    );
    
    if (!movie) {
      return ctx.reply(`❌ "${query}" nomli kino topilmadi.`);
    }
    
    const result = await deleteMovie(movie.id);
    
    if (result.error) {
      return ctx.reply(`❌ Xatolik: ${result.error.message}`);
    }
    
    await ctx.reply(`✅ **"${movie.title}"** muvaffaqiyatli o'chirildi!`, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Delete movie error:', error);
    ctx.reply('❌ Kinoni o\'chirishda xatolik yuz berdi.');
  }
}

module.exports = { 
  isAdmin, 
  handleStats, 
  handleAddMovie, 
  handleDeleteMovie 
};