import { GoogleGenAI, Type } from "@google/genai";
import { Track } from '../types';

let genAI: GoogleGenAI | null = null;

const getAIClient = () => {
  if (!genAI) {
    if (!process.env.API_KEY) {
      console.warn("API Key not found in environment.");
      return null;
    }
    genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return genAI;
};

export const analyzeTrackEnergy = async (track: Track): Promise<number> => {
  const ai = getAIClient();
  if (!ai) return 5; // Default neutral energy

  try {
    const prompt = `
      Analyze the energy level of the song "${track.title}" by "${track.artist}".
      Return a single integer between 1 (Very Chill/Ambient) and 10 (Peak Hour/Banger).
      Consider BPM (${track.bpm}) and Genre (${track.genre}) if known.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            energy: { type: Type.INTEGER },
            reasoning: { type: Type.STRING }
          }
        }
      }
    });

    const json = JSON.parse(response.text || "{}");
    return json.energy || 5;

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return 5;
  }
};

export const suggestNextTrack = async (currentTrack: Track, candidates: Track[]): Promise<string> => {
    const ai = getAIClient();
    if (!ai) return "AI unavailable";

    // Limit candidates to top 10 to save context window
    const topCandidates = candidates.slice(0, 15).map(t => 
        `- ${t.artist} - ${t.title} (Key: ${t.key}, BPM: ${t.bpm}, Energy: ${t.energy})`
    ).join('\n');

    const prompt = `
        I am a DJ playing "${currentTrack.title}" by "${currentTrack.artist}" (Key: ${currentTrack.key}, BPM: ${currentTrack.bpm}, Energy: ${currentTrack.energy}).
        
        Here are my compatible options:
        ${topCandidates}

        Select the BEST track to mix next to maintain a good flow. 
        Explain why in 2 sentences max. Focus on vibe and harmonic mixing.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return response.text || "No suggestion generated.";
    } catch (e) {
        return "Could not generate suggestion.";
    }
};

export const identifyTrackFromAudio = async (base64Audio: string): Promise<Partial<Track> | null> => {
    const ai = getAIClient();
    if (!ai) return null;

    const prompt = `
        Listen to this audio clip carefully. 
        1. Identify the song Title and Artist.
        2. Estimate the BPM (Beats Per Minute) as accurately as possible.
        3. Estimate the Energy level (1-10).
        4. Estimate the Musical Key (Camelot notation like 8A, 5B) if possible, otherwise null.
        
        Return JSON only.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: "audio/webm",
                            data: base64Audio
                        }
                    },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        artist: { type: Type.STRING },
                        title: { type: Type.STRING },
                        bpm: { type: Type.NUMBER },
                        key: { type: Type.STRING },
                        energy: { type: Type.INTEGER }
                    }
                }
            }
        });

        const json = JSON.parse(response.text || "{}");
        if (!json.title || !json.artist) return null;

        return {
            id: `live-${Date.now()}`,
            title: json.title,
            artist: json.artist,
            bpm: json.bpm || 120,
            key: json.key || "8A", // Fallback if key detection is too hard from short clip
            energy: json.energy || 5,
            genre: 'Detected Live'
        };
    } catch (e) {
        console.error("Audio identification failed", e);
        return null;
    }
};