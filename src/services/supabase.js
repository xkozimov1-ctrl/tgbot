const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase ulanish
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ============================================
// FOYDALANUVCHI FUNKSIYALARI
// ============================================

// Foydalanuvchini qo'shish yoki yangilash
async function upsertUser(telegramId, username, firstName, lastName, language = 'uz') {
  const { data, error } = await supabase
    .from('users')
    .upsert({
      telegram_id: telegramId,
      username: username,
      first_name: firstName,
      last_name: lastName,
      language: language,
      last_active: new Date().toISOString()
    }, {
      onConflict: 'telegram_id'
    })
    .select();
  
  return { data, error };
}

// Foydalanuvchi tilini olish
async function getUserLanguage(telegramId) {
  const { data, error } = await supabase
    .from('users')
    .select('language')
    .eq('telegram_id', telegramId)
    .single();
  
  if (error) return 'uz';
  return data?.language || 'uz';
}

// Foydalanuvchi tilini yangilash
async function updateUserLanguage(telegramId, language) {
  const { data, error } = await supabase
    .from('users')
    .update({ 
      language: language,
      last_active: new Date().toISOString()
    })
    .eq('telegram_id', telegramId)
    .select();
  
  return { data, error };
}

// Foydalanuvchini ban qilish
async function banUser(telegramId) {
  const { data, error } = await supabase
    .from('users')
    .update({ is_banned: true })
    .eq('telegram_id', telegramId)
    .select();
  
  return { data, error };
}

// Foydalanuvchini unban qilish
async function unbanUser(telegramId) {
  const { data, error } = await supabase
    .from('users')
    .update({ is_banned: false })
    .eq('telegram_id', telegramId)
    .select();
  
  return { data, error };
}

// Foydalanuvchi ban holatini tekshirish
async function isUserBanned(telegramId) {
  const { data, error } = await supabase
    .from('users')
    .select('is_banned')
    .eq('telegram_id', telegramId)
    .single();
  
  if (error) return false;
  return data?.is_banned || false;
}

// Barcha foydalanuvchilarni olish
async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  
  return { data, error };
}

// ============================================
// KINO FUNKSIYALARI
// ============================================

// Kino qo'shish
async function addMovie(movieData) {
  const { 
    title, 
    year, 
    rating, 
    description, 
    file_id, 
    type = 'anime',
    genre = [],
    duration = null
  } = movieData;
  
  const { data, error } = await supabase
    .from('movies')
    .insert([{ 
      title, 
      year, 
      rating, 
      description, 
      file_id, 
      type,
      genre,
      duration
    }])
    .select();
  
  return { data, error };
}

// Kinoni yangilash
async function updateMovie(id, movieData) {
  const { data, error } = await supabase
    .from('movies')
    .update(movieData)
    .eq('id', id)
    .select();
  
  return { data, error };
}

// Kinoni o'chirish
async function deleteMovie(id) {
  const { data, error } = await supabase
    .from('movies')
    .delete()
    .eq('id', id)
    .select();
  
  return { data, error };
}

// Kino izlash (full-text)
async function searchMovies(query, type = null, limit = 20) {
  // SQL funksiyasini chaqirish
  if (type) {
    const { data, error } = await supabase
      .rpc('search_movies', { search_query: query })
      .eq('type', type)
      .limit(limit);
    return { data, error };
  }
  
  const { data, error } = await supabase
    .rpc('search_movies', { search_query: query })
    .limit(limit);
  
  return { data, error };
}

// ID bo'yicha kino olish
async function getMovieById(id) {
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .eq('id', id)
    .single();
  
  return { data, error };
}

// Barcha kinolarni olish (pagination)
async function getAllMovies(page = 1, limit = 20, type = null) {
  let query = supabase
    .from('movies')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  
  if (type) {
    query = query.eq('type', type);
  }
  
  const { data, error, count } = await query;
  return { data, error, count };
}

// Kino statistikasi
async function getMovieStats() {
  const { count: total, error: err1 } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true });
  
  const { count: anime, error: err2 } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'anime');
  
  const { count: films, error: err3 } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'film');
  
  return {
    total: total || 0,
    anime: anime || 0,
    films: films || 0,
    error: err1 || err2 || err3
  };
}

// ============================================
// LOG FUNKSIYALARI
// ============================================

// Log yozish
async function logUserAction(telegramId, username, action, details = {}) {
  // Avval foydalanuvchini yangilaymiz
  await upsertUser(telegramId, username, null, null);
  
  const { data, error } = await supabase
    .from('user_logs')
    .insert([{
      user_id: telegramId,
      username: username,
      action: action,
      details: details
    }])
    .select();
  
  return { data, error };
}

// Qidiruv logini yozish
async function logSearch(telegramId, username, query, resultsCount) {
  return await logUserAction(telegramId, username, 'search', {
    query: query,
    results: resultsCount
  });
}

// ============================================
// STATISTIKA FUNKSIYALARI
// ============================================

// Umumiy statistika
async function getStats() {
  // Foydalanuvchilar soni
  const { count: users, error: err1 } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  
  // Kinolar soni
  const { count: movies, error: err2 } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true });
  
  // Qidiruvlar soni
  const { count: searches, error: err3 } = await supabase
    .from('user_logs')
    .select('*', { count: 'exact', head: true })
    .eq('action', 'search');
  
  // Bugungi foydalanuvchilar
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { count: todayUsers, error: err4 } = await supabase
    .from('user_logs')
    .select('user_id', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())
    .eq('action', 'start');
  
  // Kunlik qidiruvlar (7 kun)
  const { data: dailySearches, error: err5 } = await supabase
    .from('user_logs')
    .select('created_at')
    .eq('action', 'search')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  
  // Eng ko'p qidirilgan kinolar
  const { data: topQueries, error: err6 } = await supabase
    .from('search_stats')
    .select('query, results_count')
    .order('results_count', { ascending: false })
    .limit(10);
  
  return {
    users: users || 0,
    movies: movies || 0,
    searches: searches || 0,
    todayUsers: todayUsers || 0,
    dailySearches: dailySearches || [],
    topQueries: topQueries || [],
    error: err1 || err2 || err3 || err4 || err5 || err6
  };
}

// ============================================
// ADMIN FUNKSIYALARI
// ============================================

// Admin qo'shish
async function addAdmin(telegramId, role = 'admin', addedBy = null) {
  const { data, error } = await supabase
    .from('admins')
    .insert([{
      telegram_id: telegramId,
      role: role,
      added_by: addedBy
    }])
    .select();
  
  return { data, error };
}

// Admin o'chirish
async function removeAdmin(telegramId) {
  const { data, error } = await supabase
    .from('admins')
    .delete()
    .eq('telegram_id', telegramId)
    .select();
  
  return { data, error };
}

// Adminligini tekshirish
async function isAdmin(telegramId) {
  const { data, error } = await supabase
    .from('admins')
    .select('telegram_id')
    .eq('telegram_id', telegramId)
    .single();
  
  if (error) return false;
  return !!data;
}

// Barcha adminlarni olish
async function getAllAdmins() {
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .order('created_at', { ascending: false });
  
  return { data, error };
}

// ============================================
// SEARCH STATS (qidiruv statistikasi)
// ============================================

// Qidiruv statistikasini yangilash
async function updateSearchStats(query, resultsCount) {
  // Avval mavjudligini tekshiramiz
  const { data: existing } = await supabase
    .from('search_stats')
    .select('id, results_count, query_count')
    .eq('query', query)
    .single();
  
  if (existing) {
    // Yangilash
    const { data, error } = await supabase
      .from('search_stats')
      .update({
        results_count: resultsCount,
        query_count: existing.query_count + 1,
        last_searched: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select();
    return { data, error };
  } else {
    // Yangi qo'shish
    const { data, error } = await supabase
      .from('search_stats')
      .insert([{
        query: query,
        results_count: resultsCount,
        query_count: 1,
        last_searched: new Date().toISOString()
      }])
      .select();
    return { data, error };
  }
}

// ============================================
// EKSPORT
// ============================================

module.exports = {
  // Supabase client
  supabase,
  
  // User functions
  upsertUser,
  getUserLanguage,
  updateUserLanguage,
  banUser,
  unbanUser,
  isUserBanned,
  getAllUsers,
  
  // Movie functions
  addMovie,
  updateMovie,
  deleteMovie,
  searchMovies,
  getMovieById,
  getAllMovies,
  getMovieStats,
  
  // Log functions
  logUserAction,
  logSearch,
  
  // Stats functions
  getStats,
  updateSearchStats,
  
  // Admin functions
  addAdmin,
  removeAdmin,
  isAdmin,
  getAllAdmins
};