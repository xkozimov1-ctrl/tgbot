const { Markup } = require('telegraf');
const { t, setLanguage, getLanguage } = require('../middlewares/i18n');
const { logUserAction } = require('../services/supabase');

// ============================================
// /start - BOSHLASH
// ============================================
async function startCommand(ctx) {
  const userId = ctx.from.id;
  
  await logUserAction(userId, ctx.from.username, 'start');
  
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🇺🇿 O\'zbek', 'lang_uz')],
    [Markup.button.callback('🇷🇺 Русский', 'lang_ru')],
    [Markup.button.callback('🇬🇧 English', 'lang_en')]
  ]);
  
  const welcomeMessage = `
${t(userId, 'welcome')}

📌 **Botdan foydalanish:**
• Kino nomini yozing - qidirish
• /help - yordam
• /about - bot haqida

🌐 **Tilni o'zgartirish** uchun tugmani bosing.
  `;
  
  await ctx.reply(welcomeMessage, {
    parse_mode: 'Markdown',
    ...keyboard
  });
  
  // Asosiy menyu
  const menu = Markup.keyboard([
    ['🔍 Kino izlash', '🌐 Til'],
    ['❓ Yordam']
  ]).resize();
  
  await ctx.reply('🏠 **Asosiy menyu:**', {
    parse_mode: 'Markdown',
    ...menu
  });
}

// ============================================
// /help - YORDAM
// ============================================
async function helpCommand(ctx) {
  const userId = ctx.from.id;
  
  const helpMessage = `
📖 **Yordam**

🔍 **Kino izlash:**
Kino yoki anime nomini yozing, bot sizga natijalarni ko'rsatadi.

🎬 **Mavjud turlar:**
• Anime
• Filmlar

🌐 **Tillar:**
• O'zbek 🇺🇿
• Русский 🇷🇺
• English 🇬🇧

👤 **Buyruqlar:**
/start - Boshlash
/help - Yordam
/about - Bot haqida

👑 **Admin buyruqlari:**
/stats - Statistika
/add_movie - Kino qo'shish
/delete_movie - Kino o'chirish
  `;
  
  await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
}

// ============================================
// /about - BOT HAQIDA
// ============================================
async function aboutCommand(ctx) {
  const userId = ctx.from.id;
  
  const aboutMessage = `
ℹ️ **BMT Anime Bot**

🎬 **Vazifa:** Anime va filmlarni qidirish va ko'rish

🤖 **Texnologiyalar:**
• Node.js
• Telegraf
• Supabase

🌍 **Tillar:** O'zbek, Rus, Ingliz

👨‍💻 **Yaratuvchi:** BMT Team

📅 **Versiya:** 1.0.0

🔗 **Manba:** GitHub
  `;
  
  await ctx.reply(aboutMessage, { parse_mode: 'Markdown' });
}

module.exports = { startCommand, helpCommand, aboutCommand };