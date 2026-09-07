require('dotenv').config();
const express = require('express');
const { Telegraf, session, Markup } = require('telegraf');
const { t, setLanguage, getLanguage } = require('./middlewares/i18n');
const { 
  upsertUser, 
  isUserBanned, 
  logUserAction,
  searchMovies 
} = require('./services/supabase');
const { isAdmin, handleStats, handleAddMovie, handleDeleteMovie } = require('./admin/admin');
const { startCommand, helpCommand, aboutCommand } = require('./handlers/commands');
const { handleLanguageCallback } = require('./handlers/inline');
const { handleSearchButton, handleLanguageButton, handleTextMessage } = require('./handlers/messages');

// ============================================
// EXPRESS SERVER (Render uchun health check)
// ============================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.status(200).send('BMT Anime Bot is running!');
});

app.listen(PORT, () => {
  console.log(`🌐 Health check server running on port ${PORT}`);
});

// ============================================
// BOTNI YARATISH
// ============================================
const bot = new Telegraf(process.env.BOT_TOKEN);

// Session middleware
bot.use(session());

// ============================================
// GLOBAL MIDDLEWARE
// ============================================
bot.use(async (ctx, next) => {
  if (!ctx.from) return next();
  
  try {
    const userId = ctx.from.id;
    const banned = await isUserBanned(userId);
    
    if (banned) {
      return ctx.reply('⛔ Siz botdan foydalanish uchun bloklangansiz!');
    }
    
    // Foydalanuvchini ma'lumotlar bazasiga saqlash
    await upsertUser(
      userId,
      ctx.from.username || '',
      ctx.from.first_name || '',
      ctx.from.last_name || ''
    );
    
    // Action log
    if (ctx.message && ctx.message.text) {
      await logUserAction(userId, ctx.from.username, 'message');
    }
    
  } catch (error) {
    console.error('Middleware error:', error);
  }
  
  return next();
});

// ============================================
// BUYRUQLAR
// ============================================
bot.command('start', startCommand);
bot.command('help', helpCommand);
bot.command('about', aboutCommand);
bot.command('stats', handleStats);
bot.command('add_movie', handleAddMovie);
bot.command('delete_movie', handleDeleteMovie);

// ============================================
// INLINE CALLBACKLAR
// ============================================
bot.action(/lang_(.+)/, handleLanguageCallback);

// ============================================
// MATNLI XABARLAR
// ============================================
bot.hears(/^🔍 Kino izlash$/i, handleSearchButton);
bot.hears(/^🌐 Til$/i, handleLanguageButton);
bot.hears(/^❓ Yordam$/i, helpCommand);
bot.on('text', handleTextMessage);

// ============================================
// XATOLIKLARNI USHLASH
// ============================================
bot.catch((err, ctx) => {
  console.error('❌ Bot error:', err);
  const userId = ctx.from?.id || 'unknown';
  const errorMsg = t(userId, 'error') || '⚠️ Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.';
  
  try {
    ctx.reply(errorMsg);
  } catch (e) {
    console.error('Error replying to user:', e);
  }
});

// ============================================
// BOTNI ISHGA TUSHIRISH
// ============================================
async function startBot() {
  try {
    // Webhook'ni tozalash (409 xatolikni oldini olish)
    await bot.telegram.setWebhook('');
    console.log('✅ Webhook cleared');
    
    // Botni ishga tushirish
    await bot.launch({
      dropPendingUpdates: true
    });
    
    // Bot ma'lumotlarini olish
    const botInfo = await bot.telegram.getMe();
    console.log('✅ Bot ishga tushdi!');
    console.log(`📊 Bot username: @${botInfo.username}`);
    console.log(`🆔 Bot ID: ${botInfo.id}`);
    console.log(`👥 Admin IDs: ${process.env.ADMIN_IDS}`);
    
  } catch (error) {
    console.error('❌ Bot ishga tushmadi:', error);
    process.exit(1);
  }
}

// ============================================
// TO'XTATISH SIGNALLARI
// ============================================
process.once('SIGINT', () => {
  console.log('🛑 Bot to\'xtatilmoqda (SIGINT)...');
  bot.stop('SIGINT');
  process.exit(0);
});

process.once('SIGTERM', () => {
  console.log('🛑 Bot to\'xtatilmoqda (SIGTERM)...');
  bot.stop('SIGTERM');
  process.exit(0);
});

// ============================================
// BOTNI ISHGA TUSHIRISH
// ============================================
startBot();

// Unhandled rejection
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Unhandled exception
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});