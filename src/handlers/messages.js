const { t } = require('../middlewares/i18n');
const { searchMovies, logUser } = require('../services/supabase');
const { Markup } = require('telegraf');

// "Kino izlash" tugmasi
async function handleSearchButton(ctx) {
  const userId = ctx.from.id;
  return ctx.reply(t(userId, 'search_prompt'));
}

// "Til" tugmasi
async function handleLanguageButton(ctx) {
  const userId = ctx.from.id;
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🇺🇿 O\'zbek', 'lang_uz')],
    [Markup.button.callback('🇷🇺 Русский', 'lang_ru')],
    [Markup.button.callback('🇬🇧 English', 'lang_en')]
  ]);
  return ctx.reply(t(userId, 'choose_language'), keyboard);
}

// Matnli xabar (kino izlash)
async function handleTextMessage(ctx) {
  const userId = ctx.from.id;
  const query = ctx.message.text.trim();
  
  if (query.length < 2) return;
  if (query === '🔍 Kino izlash' || query === '🌐 Til') return;
  
  await logUser(userId, ctx.from.username, 'search');
  
  const { data, error } = await searchMovies(query);
  
  if (error || !data || data.length === 0) {
    return ctx.reply(t(userId, 'not_found'));
  }
  
  for (const movie of data) {
    const info = t(userId, 'movie_info', {
      title: movie.title,
      year: movie.year || 'N/A',
      rating: movie.rating || 'N/A',
      description: movie.description || '...'
    });
    
    await ctx.replyWithVideo(movie.file_id, {
      caption: info,
      parse_mode: 'Markdown'
    });
  }
}

module.exports = { handleSearchButton, handleLanguageButton, handleTextMessage };