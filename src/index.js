require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const { t } = require('./middlewares/i18n');
const { handleStats, handleAddMovie } = require('./admin/admin');
const { startCommand, helpCommand } = require('./handlers/commands');
const { handleLanguageCallback } = require('./handlers/inline');
const { handleSearchButton, handleLanguageButton, handleTextMessage } = require('./handlers/messages');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Session
bot.use(session());

// ============ BUYRUQLAR ============
bot.command('start', startCommand);
bot.command('help', helpCommand);
bot.command('stats', handleStats);
bot.command('add_movie', handleAddMovie);

// ============ CALLBACKLAR ============
bot.action(/lang_(.+)/, handleLanguageCallback);

// ============ MATNLI XABARLAR ============
bot.hears('🔍 Kino izlash', handleSearchButton);
bot.hears('🌐 Til', handleLanguageButton);
bot.on('text', handleTextMessage);

// ============ XATOLIK ============
bot.catch((err, ctx) => {
  console.error('❌ Bot error:', err);
  ctx.reply(t(ctx.from?.id || 'uz', 'error'));
});

// ============ ISHGA TUSHIRISH ============
bot.launch()
  .then(() => console.log('✅ Bot ishga tushdi!'))
  .catch(err => console.error('❌ Bot ishga tushmadi:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));