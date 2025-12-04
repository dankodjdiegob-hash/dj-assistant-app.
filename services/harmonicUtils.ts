import { Track, Recommendation, CamelotKey, CamelotMode } from '../types';

// Helper to parse key string "8A" -> { number: 8, mode: 'A' }
export const parseKey = (keyStr: string): CamelotKey | null => {
  if (!keyStr) return null;
  const match = keyStr.trim().match(/^(\d{1,2})([ABab])$/);
  if (!match) return null;
  return {
    number: parseInt(match[1], 10),
    mode: match[2].toUpperCase() as CamelotMode,
  };
};

export const getCompatibleKeys = (currentKeyStr: string): string[] => {
  const current = parseKey(currentKeyStr);
  if (!current) return [];

  const { number, mode } = current;
  const compatible: string[] = [];

  // 1. Perfect Match (Misma nota)
  compatible.push(`${number}${mode}`);

  // 2. Key Change (+/- 1 hora en el reloj)
  const nextNum = number === 12 ? 1 : number + 1;
  const prevNum = number === 1 ? 12 : number - 1;
  compatible.push(`${nextNum}${mode}`);
  compatible.push(`${prevNum}${mode}`);

  // 3. Mode Change (Cambio relativo Mayor/Menor)
  const otherMode = mode === CamelotMode.Major ? CamelotMode.Minor : CamelotMode.Major;
  compatible.push(`${number}${otherMode}`);
  
  return compatible;
};

// Calculate match score
export const calculateCompatibility = (currentTrack: Track, candidate: Track): Recommendation | null => {
  // Evitar compararse consigo mismo
  if (currentTrack.id === candidate.id) return null;
  if (!currentTrack.bpm || !candidate.bpm) return null;

  let score = 0;
  let mixType: Recommendation['mixType'] = 'Vibe Change';
  let reasons: string[] = [];

  // --- 1. BPM CHECK (Fundamental para DJs) ---
  const bpmDiff = Math.abs(currentTrack.bpm - candidate.bpm);
  const bpmPercent = (bpmDiff / currentTrack.bpm) * 100;

  // Si la diferencia es mayor al 8%, es muy difícil de mezclar manualmente sin sonar mal
  // A menos que sea double time / half time
  const isDoubleTime = Math.abs(candidate.bpm - (currentTrack.bpm * 2)) < 5;
  const isHalfTime = Math.abs(candidate.bpm - (currentTrack.bpm / 2)) < 5;

  if (bpmPercent <= 3) {
    score += 40; // Tempo casi idéntico
    reasons.push("BPM Exacto");
  } else if (bpmPercent <= 6) {
    score += 25; // Mezclable con pitch
    reasons.push("BPM Ajustable");
  } else if (isDoubleTime || isHalfTime) {
    score += 20;
    reasons.push("Tiempo Doble/Mitad");
  } else {
    // Si el BPM está muy lejos, penalizamos fuertemente o descartamos
    return null; 
  }

  // --- 2. KEY CHECK (Armonía) ---
  const currentKey = parseKey(currentTrack.key);
  const candidateKey = parseKey(candidate.key);
  
  if (currentKey && candidateKey) {
      const compatibleKeys = getCompatibleKeys(currentTrack.key);
      
      if (currentTrack.key === candidate.key) {
        score += 50;
        mixType = 'Perfect';
        reasons.push("Tono Idéntico");
      } else if (compatibleKeys.includes(candidate.key)) {
        score += 40;
        mixType = 'Harmonic';
        reasons.push("Armonía Compatible");
      } else {
         // Chequeo de Energy Boost (+1 o +2 semitonos / numeros camelot)
         // Ejemplo: 8A -> 9A (Subida)
         const numDiff = candidateKey.number - currentKey.number;
         // Manejar el cruce de 12 a 1
         const diffAdjusted = (numDiff === -11) ? 1 : numDiff;
         
         if (candidateKey.mode === currentKey.mode && diffAdjusted === 1) {
            score += 35;
            mixType = 'Energy Boost';
            reasons.push("Subida Energía (+1)");
         } else if (candidateKey.mode === currentKey.mode && diffAdjusted === 2) {
             score += 20;
             mixType = 'Energy Boost';
             reasons.push("Salto Energía (+2)");
         } else {
            // Si no es armónico ni boost, penalizamos
            score -= 20;
         }
      }
  }

  // --- 3. ENERGY CHECK (Vibe) ---
  // Intentamos mantener o subir la energía ligeramente, pero no bajarla de golpe
  if (currentTrack.energy && candidate.energy) {
    const energyDiff = candidate.energy - currentTrack.energy;
    
    if (energyDiff === 0) {
        score += 15; // Mantiene el flow
    } else if (energyDiff === 1 || energyDiff === 2) {
        score += 10; // Sube la fiesta
    } else if (energyDiff < 0 && energyDiff >= -1) {
        score += 5; // Baja un poco para descansar
    } else if (energyDiff < -2) {
        score -= 15; // Mata la fiesta (bajada brusca)
        reasons.push("Bajada brusca");
    } else if (energyDiff > 3) {
        score -= 5; // Subida demasiado agresiva
    }
  }

  // Filtro final: Solo mostramos si tiene una puntuación decente
  if (score < 45) return null;

  return {
    track: candidate,
    compatibilityScore: score,
    reason: reasons.join(", "),
    mixType
  };
};

export const parseCSV = (text: string): Track[] => {
  const lines = text.split('\n');
  const tracks: Track[] = [];
  
  // Headers index mapping
  let idxArtist = -1;
  let idxTitle = -1;
  let idxBpm = -1;
  let idxKey = -1;
  let idxGenre = -1;

  lines.forEach((line, index) => {
    if (!line.trim()) return;

    // Parseo robusto de CSV respetando comillas
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.replace(/^"|"$/g, '').trim());

    // Detectar cabeceras en la primera línea o si encontramos palabras clave
    if (index === 0 || (idxArtist === -1 && parts.some(p => p.toLowerCase() === 'bpm'))) {
        parts.forEach((col, i) => {
            const c = col.toLowerCase();
            if (c === 'artist' || c === 'artista') idxArtist = i;
            if (c === 'title' || c === 'name' || c === 'song' || c === 'canción' || c === 'titulo') idxTitle = i;
            if (c === 'bpm' || c === 'tempo') idxBpm = i;
            if (c === 'key' || c === 'key text' || c === 'tono') idxKey = i;
            if (c === 'genre' || c === 'género') idxGenre = i;
        });
        // Si encontramos cabeceras, saltamos esta línea
        if (idxArtist !== -1 || idxTitle !== -1) return;
    }

    // Si no detectamos cabeceras, usamos índices por defecto comunes en Serato/VDJ
    // Default Serato Simple Text: Artist, Title, BPM, Key... (pero puede variar)
    const artist = idxArtist !== -1 ? parts[idxArtist] : parts[0];
    const title = idxTitle !== -1 ? parts[idxTitle] : parts[1];
    
    // Extracción inteligente si no hay índices definidos
    let bpm = idxBpm !== -1 ? parseFloat(parts[idxBpm]) : 0;
    let key = idxKey !== -1 ? parts[idxKey] : '';
    let genre = idxGenre !== -1 ? parts[idxGenre] : '';

    // Si falló la detección de cabeceras, usamos heurística
    if (!bpm || !key) {
         for (let i = 2; i < parts.length; i++) {
            const val = parts[i];
            // Detectar BPM (numero entre 60 y 220)
            if (!bpm && !isNaN(parseFloat(val)) && parseFloat(val) > 50 && parseFloat(val) < 220) {
                bpm = parseFloat(val);
                continue;
            }
            // Detectar Key (Formato 8A, 12B, etc)
            if (!key && val.match(/^(\d{1,2})[ABabmn]$/)) { // 8A, 8m, etc
                key = val.toUpperCase().replace('M', 'A'); // Fix simple minor notation if needed
                continue;
            }
             // Asumir Genre si es texto largo y no numérico
            if (!genre && val.length > 3 && isNaN(parseFloat(val))) {
                genre = val;
            }
         }
    }

    if (artist && title) {
        // Normalizar Key para Camelot (Si viene como 8m -> 8A, etc)
        // Algunos programas exportan "Am" en lugar de "8A", aquí asumimos que el usuario ya tiene Camelot
        // o que el parser lo coge bien.
        
        tracks.push({
          id: `${index}-${title.replace(/\s/g, '')}`,
          artist,
          title,
          bpm: bpm || 120, // Default
          key: key || '12A', // Default
          genre: genre || 'Unknown',
          energy: Math.floor(Math.random() * 4) + 6 // Simulación inicial
        });
    }
  });
  return tracks;
};