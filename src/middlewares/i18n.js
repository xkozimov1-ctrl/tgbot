const locales = {
  uz: require('../locales/uz.json'),
  ru: require('../locales/ru.json'),
  en: require('../locales/en.json')
};

// Foydalanuvchi tilini saqlash (oddiy Map)
const userLanguage = new Map();

function getLanguage(userId) {
  return userLanguage.get(userId) || 'uz'; // default O'zbek
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
  let text = locales[lang][key] || locales['uz'][key] || key;
  
  // Parametrlarni almashtirish
  Object.keys(params).forEach(k => {
    text = text.replace(`{${k}}`, params[k]);
  });
  
  return text;
}

module.exports = { getLanguage, setLanguage, t };