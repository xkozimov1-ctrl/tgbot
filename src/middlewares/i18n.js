const fs = require('fs');
const path = require('path');

// ============================================
// TARJIMALARNI YUKLASH
// ============================================
const locales = {
  uz: JSON.parse(fs.readFileSync(path.join(__dirname, '../locales/uz.json'), 'utf8')),
  ru: JSON.parse(fs.readFileSync(path.join(__dirname, '../locales/ru.json'), 'utf8')),
  en: JSON.parse(fs.readFileSync(path.join(__dirname, '../locales/en.json'), 'utf8'))
};

// Foydalanuvchi tilini saqlash
const userLanguage = new Map();

// ============================================
// TIL FUNKSIYALARI
// ============================================
function getLanguage(userId) {
  return userLanguage.get(userId) || 'uz';
}

function setLanguage(userId, lang) {
  if (locales[lang]) {
    userLanguage.set(userId, lang);
    return true;
  }
  return false;
}

function t(userId, key, params = {}) {
  const lang = getLanguage(userId);
  let text = locales[lang]?.[key] || locales['uz']?.[key] || key;
  
  // Parametrlarni almashtirish
  Object.keys(params).forEach(k => {
    text = text.replace(new RegExp(`{${k}}`, 'g'), params[k]);
  });
  
  return text;
}

module.exports = { getLanguage, setLanguage, t };