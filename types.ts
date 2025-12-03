
export enum CamelotMode {
  Major = 'B', // Outer Ring
  Minor = 'A', // Inner Ring
}

export interface CamelotKey {
  number: number; // 1-12
  mode: CamelotMode;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  key: string; // e.g., "8A", "12B"
  energy?: number; // 1-10
  genre?: string;
  originalData?: any; // To store raw CSV row if needed
}

export interface ParsedLibrary {
  tracks: Track[];
  source: 'Serato' | 'VirtualDJ' | 'Manual' | 'Demo';
}

export interface Recommendation {
  track: Track;
  compatibilityScore: number;
  reason: string;
  mixType: 'Perfect' | 'Harmonic' | 'Energy Boost' | 'Vibe Change';
}

export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'asking';

export interface ClientRequest {
  id: string;
  clientName: string;
  songRequest: string;
  status: RequestStatus;
  timestamp: number;
  reply?: string; // Mensaje de respuesta del DJ
}