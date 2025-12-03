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
  
  lines.forEach((line, index) => {
    if (index === 0) return; // Skip header
    if (!line.trim()) return;

    // Intento básico de parseo CSV (maneja comas simples)
    // Serato Export: Artist, Title, Album, Length, BPM, Key, ...
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); 
    
    // Mapeo flexible para demos. 
    // Lo ideal es detectar headers, pero asumiremos un formato estándar:
    // Artist, Title, BPM, Key, Genre (o similar)
    if (parts.length >= 2) {
      const clean = (s: string) => s ? s.replace(/"/g, '').trim() : '';
      
      // Intentamos adivinar columnas o usar índices fijos comunes
      const artist = clean(parts[0]);
      const title = clean(parts[1]);
      
      // Buscamos columnas que parezcan números para BPM
      let bpm = 0;
      let key = '';
      let genre = '';

      // Iteramos partes buscando patrones
      for (let i = 2; i < parts.length; i++) {
          const val = clean(parts[i]);
          // Detectar BPM (numero entre 60 y 200)
          if (!bpm && !isNaN(parseFloat(val)) && parseFloat(val) > 50 && parseFloat(val) < 220) {
              bpm = parseFloat(val);
              continue;
          }
          // Detectar Key (Formato 8A, 12B, etc)
          if (!key && val.match(/^(\d{1,2})[ABab]$/)) {
              key = val.toUpperCase();
              continue;
          }
          // Asumir Genre si es texto largo
          if (!genre && val.length > 3 && isNaN(parseFloat(val))) {
              genre = val;
          }
      }

      if (artist && title) {
        tracks.push({
          id: `${index}-${title}`,
          artist,
          title,
          bpm: bpm || 120, // Default a 120 si falla
          key: key || '12A', // Default random si falla
          genre: genre || 'Unknown',
          energy: Math.floor(Math.random() * 4) + 6 // Simula energía media-alta para demo
        });
      }
    }
  });
  return tracks;
};