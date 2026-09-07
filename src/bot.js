const { Telegraf, session } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Session
bot.use(session());

// Admin IDs
const ADMIN_IDS = process.env.ADMIN_IDS
  ? process.env.ADMIN_IDS.split(',').map(id => Number(id.trim()))
  : [];

module.exports = { bot, ADMIN_IDS };