const { setLanguage, getLanguage, t } = require('../middlewares/i18n');
const { Markup } = require('telegraf');

// Til tanlash callback
async function handleLanguageCallback(ctx) {
  const lang = ctx.match[1];
  const userId = ctx.from.id;
  
  setLanguage(userId, lang);
  await ctx.answerCbQuery(`✅ Til ${lang.toUpperCase()} ga o'zgartirildi!`);
  
  const menu = Markup.keyboard([
    ['🔍 Kino izlash', '🌐 Til']
  ]).resize();
  
  return ctx.reply(t(userId, 'language_selected'), menu);
}

module.exports = { handleLanguageCallback };