// Utility function to check if user has voted for current daily mode
async function hasUserVoted(userId) {
  try {
    // Get daily mode from database
    const settings = await supabase.getAppSettings();
    const currentMode = settings.daily_mode || 'drift';
    const category = currentMode === 'drift' ? 'drift' : 'time_attack';
    
    // Sprawdź czy użytkownik głosował
    const votes = await supabase.query('votes', {
      select: '*',
      eq: { user_id: userId, category: category },
      limit: 1
    });
    
    return votes.length > 0;
  } catch (error) {
    console.error('Check vote error:', error);
    return false;
  }
}

// Sprawdź czy użytkownik może anulować głos
async function canUserCancelVote(userId) {
  try {
    const settings = await supabase.getAppSettings();
    const currentMode = settings.daily_mode || 'drift';
    const category = currentMode === 'drift' ? 'drift' : 'time_attack';
    
    // Sprawdź czy użytkownik już anulował głos
    const cancellations = await supabase.query('vote_cancellations', {
      select: '*',
      eq: { user_id: userId, category: category },
      limit: 1
    });
    
    return cancellations.length === 0; // Może anulować tylko jeśli jeszcze nie anulował
  } catch (error) {
    console.error('Check cancel vote error:', error);
    return false;
  }
}

// Sprawdź czy użytkownik może głosować (uwzględniając anulowania)
async function canUserVote(userId) {
  try {
    const settings = await supabase.getAppSettings();
    const currentMode = settings.daily_mode || 'drift';
    const category = currentMode === 'drift' ? 'drift' : 'time_attack';
    
    // Sprawdź czy użytkownik już głosował
    const votes = await supabase.query('votes', {
      select: '*',
      eq: { user_id: userId, category: category },
      limit: 1
    });
    
    // Sprawdź ile razy anulował głos
    const cancellations = await supabase.query('vote_cancellations', {
      select: '*',
      eq: { user_id: userId, category: category }
    });
    
    // Może głosować jeśli:
    // 1. Nie głosował wcale (pierwszy głos), LUB
    // 2. Nie ma aktywnego głosu I anulował tylko raz (drugi głos po anulowaniu)
    if (votes.length === 0 && cancellations.length === 0) {
      return true; // Pierwszy głos - nie głosował, nie anulował
    } else if (votes.length === 0 && cancellations.length === 1) {
      return true; // Drugi głos - anulował poprzedni, może zagłosować ponownie
    } else if (votes.length > 0 && cancellations.length === 0) {
      return false; // Ma aktywny głos, nie może głosować ponownie
    } else if (votes.length > 0 && cancellations.length === 1) {
      return false; // Ma aktywny głos po anulowaniu - to już drugi głos, koniec
    } else {
      return false; // Inne przypadki - brak możliwości głosowania
    }
  } catch (error) {
    console.error('Check can vote error:', error);
    return false;
  }
}