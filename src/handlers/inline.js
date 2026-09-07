const { Markup } = require('telegraf');
const { setLanguage, getLanguage, t } = require('../middlewares/i18n');
const { updateUserLanguage, logUserAction } = require('../services/supabase');

// ============================================
// TIL TANLASH CALLBACK
// ============================================
async function handleLanguageCallback(ctx) {
  const lang = ctx.match[1];
  const userId = ctx.from.id;
  
  try {
    // Tilni o'zgartirish
    setLanguage(userId, lang);
    await updateUserLanguage(userId, lang);
    await logUserAction(userId, ctx.from.username, 'change_language', { language: lang });
    
    await ctx.answerCbQuery(`✅ Til ${lang.toUpperCase()} ga o'zgartirildi!`);
    
    // Asosiy menyu
    const menu = Markup.keyboard([
      ['🔍 Kino izlash', '🌐 Til'],
      ['❓ Yordam']
    ]).resize();
    
    await ctx.reply(t(userId, 'language_selected'), menu);
    
  } catch (error) {
    console.error('Language change error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
  }
}

module.exports = { handleLanguageCallback };