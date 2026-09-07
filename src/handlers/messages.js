const { Markup } = require('telegraf');
const { t, getLanguage } = require('../middlewares/i18n');
const { 
  searchMovies, 
  logSearch, 
  logUserAction,
  updateSearchStats 
} = require('../services/supabase');

// ============================================
// "Kino izlash" TUGMASI
// ============================================
async function handleSearchButton(ctx) {
  const userId = ctx.from.id;
  await ctx.reply(t(userId, 'search_prompt'));
}

// ============================================
// "Til" TUGMASI
// ============================================
async function handleLanguageButton(ctx) {
  const userId = ctx.from.id;
  
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🇺🇿 O\'zbek', 'lang_uz')],
    [Markup.button.callback('🇷🇺 Русский', 'lang_ru')],
    [Markup.button.callback('🇬🇧 English', 'lang_en')]
  ]);
  
  await ctx.reply(t(userId, 'choose_language'), keyboard);
}

// ============================================
// MATNLI XABAR (KINO QIDIRISH)
// ============================================
async function handleTextMessage(ctx) {
  const userId = ctx.from.id;
  const query = ctx.message.text.trim();
  
  // Tugmalarni ignore qilish
  if (['🔍 Kino izlash', '🌐 Til', '❓ Yordam'].includes(query)) {
    return;
  }
  
  // Qisqa so'rovlarni ignore qilish
  if (query.length < 2) {
    return;
  }
  
  try {
    // Qidiruv logi
    await logUserAction(userId, ctx.from.username, 'search', { query });
    
    // Kino qidirish
    const { data: movies, error } = await searchMovies(query);
    
    if (error) {
      console.error('Search error:', error);
      return ctx.reply(t(userId, 'error'));
    }
    
    if (!movies || movies.length === 0) {
      await updateSearchStats(query, 0);
      return ctx.reply(t(userId, 'not_found'));
    }
    
    // Qidiruv statistikasini yangilash
    await updateSearchStats(query, movies.length);
    
    // Qidiruv logini saqlash
    await logSearch(userId, ctx.from.username, query, movies.length);
    
    // Natijalarni chiqarish
    let resultCount = 0;
    for (const movie of movies) {
      if (resultCount >= 10) break; // Maks 10 ta kino
      
      const info = t(userId, 'movie_info', {
        title: movie.title || 'N/A',
        year: movie.year || 'N/A',
        rating: movie.rating || 'N/A',
        description: (movie.description || '').substring(0, 200) + '...'
      });
      
      try {
        await ctx.replyWithVideo(movie.file_id, {
          caption: info,
          parse_mode: 'Markdown'
        });
        resultCount++;
      } catch (videoError) {
        console.error('Video send error:', videoError);
        // Agar video yuborishda xatolik bo'lsa, matn sifatida yuborish
        await ctx.reply(`
🎬 **${movie.title}**
📅 Yil: ${movie.year || 'N/A'}
⭐ Reyting: ${movie.rating || 'N/A'}
📝 ${(movie.description || '').substring(0, 200)}

❌ Video yuborishda xatolik yuz berdi.
        `, { parse_mode: 'Markdown' });
      }
    }
    
    // Agar ko'p natija bo'lsa
    if (movies.length > 10) {
      await ctx.reply(`📊 Jami ${movies.length} ta natija topildi. Faqat 10 tasi ko'rsatilmoqda.`);
    }
    
  } catch (error) {
    console.error('Message handler error:', error);
    await ctx.reply(t(userId, 'error'));
  }
}

module.exports = { handleSearchButton, handleLanguageButton, handleTextMessage };