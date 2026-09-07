const { t } = require('../middlewares/i18n');
const { searchMovies, logUser } = require('../services/supabase');
const { isAdmin } = require('../admin/admin');

// /start
async function startCommand(ctx) {
  const userId = ctx.from.id;
  await logUser(userId, ctx.from.username, 'start');
  
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🇺🇿 O\'zbek', 'lang_uz')],
    [Markup.button.callback('🇷🇺 Русский', 'lang_ru')],
    [Markup.button.callback('🇬🇧 English', 'lang_en')]
  ]);
  
  return ctx.reply(t(userId, 'welcome'), keyboard);
}

// /help
async function helpCommand(ctx) {
  const userId = ctx.from.id;
  return ctx.reply('📖 Yordam:\n🔍 Kino izlash - matn yuboring\n🌐 Tilni o\'zgartirish - /lang');
}

module.exports = { startCommand, helpCommand };