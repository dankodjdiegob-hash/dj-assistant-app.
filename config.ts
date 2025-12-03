
import React, { useState, useMemo, useEffect } from 'react';
import { Track, Recommendation, CamelotKey, CamelotMode, ClientRequest, RequestStatus } from './types';
import { calculateCompatibility, getCompatibleKeys, parseCSV, parseKey } from './services/harmonicUtils';
import { analyzeTrackEnergy, suggestNextTrack, identifyTrackFromAudio } from './services/geminiService';
import { subscribeToRequests, sendRequestToDb, updateRequestStatusInDb, deleteRequestInDb, clearAllRequestsInDb } from './services/firebaseConfig';
import CamelotWheel from './components/CamelotWheel';
import { appConfig } from './config';
import { Music, Upload, Zap, Disc, Search, Activity, Wand2, Globe, Mic, MicOff, ListFilter, FolderOpen, ArrowRight, ArrowUpRight, ArrowDownRight, RefreshCw, MessageSquare, Copy, X, CheckCircle, XCircle, Trash2, Inbox, PlusCircle, Disc3, HardDrive, LayoutTemplate, Home, Flame, History, Clock, HelpCircle, Send, Smartphone, User, Loader2, Cloud, CloudOff, Link as LinkIcon, Share2 } from 'lucide-react';

// Demo Data (Fallback when offline)
const DEMO_TRACKS: Track[] = [
    { id: '1', artist: 'Daft Punk', title: 'One More Time', bpm: 123, key: '8B', energy: 8, genre: 'House' },
    { id: '2', artist: 'Stardust', title: 'Music Sounds Better With You', bpm: 124, key: '8B', energy: 7, genre: 'House' },
    { id: '3', artist: 'Modjo', title: 'Lady (Hear Me Tonight)', bpm: 126, key: '9B', energy: 6, genre: 'House' },
    { id: '4', artist: 'Deadmau5', title: 'Strobe', bpm: 128, key: '8A', energy: 5, genre: 'Progressive' },
    { id: '5', artist: 'Kaskade', title: 'Atmosphere', bpm: 128, key: '7A', energy: 9, genre: 'EDM' },
    { id: '6', artist: 'Zedd', title: 'Clarity', bpm: 128, key: '6A', energy: 9, genre: 'Pop' },
    { id: '7', artist: 'Calvin Harris', title: 'Summer', bpm: 128, key: '12B', energy: 8, genre: 'Pop' },
    { id: '8', artist: 'Fisher', title: 'Losing It', bpm: 125, key: '2A', energy: 10, genre: 'Tech House' },
    { id: '9', artist: 'CamelPhat', title: 'Cola', bpm: 122, key: '8A', energy: 6, genre: 'Deep House' },
    { id: '10', artist: 'Swedish House Mafia', title: 'Don\'t You Worry Child', bpm: 129, key: '2B', energy: 9, genre: 'Progressive' },
];

const DEMO_REQUESTS: ClientRequest[] = [
    { id: 'r1', clientName: 'Camila', songRequest: 'Bad Bunny (Demo Local)', status: 'pending', timestamp: Date.now() },
    { id: 'r2', clientName: 'Juan', songRequest: 'House Music (Demo Local)', status: 'pending', timestamp: Date.now() - 60000 },
];

// Translations Configuration
const TRANSLATIONS = {
  en: {
    title: `${appConfig.appTitle} - ${appConfig.djName}`,
    subtitle: "Intelligent DJ Assistant",
    nowPlaying: "Now Playing / Live Input",
    selectTrack: "Select a track or use Mic",
    aiSuggest: "AI Suggestion",
    thinking: "Listening to the vibe...",
    btnThinking: "Thinking...",
    import: "Import Base (Reset)",
    importUsb: "Add USB / Extra",
    searchPlaceholder: "Search library...",
    tracksLoaded: "Tracks",
    geminiSuggestion: "Gemini Strategy",
    recommended: "Best Mix Matches",
    fullLibrary: "Full Library",
    perfect: "Perfect Mix",
    harmonic: "Harmonic",
    energyBoost: "Energy Boost",
    vibeChange: "Vibe Change",
    reason: "Why?",
    key: "KEY",
    bpm: "BPM",
    energy: "NRG",
    currentKeyLabel: "Current Key",
    alertNoTracks: "No valid tracks found. Ensure CSV has Artist, Title, BPM, Key columns.",
    listen: "Listen Live",
    listening: "Recording...",
    identifying: "Identifying Song...",
    identifyError: "Could not identify song.",
    matchesFound: "Compatible tracks found",
    filterGenre: "Filter by Genre",
    allGenres: "All Genres",
    harmonicOptions: "Harmonic Options",
    relMajorMinor: "Rel. Major/Minor",
    energyUp: "Energy Boost (+1)",
    energyDown: "Energy Drop (-1)",
    requestMode: "Client Requests",
    searchRequest: "Type song request...",
    requestResults: "Request Matches",
    exactMatch: "Exact Match",
    copied: "Copied to Clipboard!",
    doubleClickInfo: "Double click to copy",
    exitRequest: "Exit Requests",
    inbox: "Request Inbox",
    clearAll: "Clear All",
    simulate: "Simulate New",
    accept: "Accept",
    reject: "Reject",
    ask: "Ask Client",
    asking: "Asking...",
    sendReply: "Send",
    quickConfirmArtist: "Artist?",
    quickConfirmSong: "Song Name?",
    quickConfirmVersion: "Remix?",
    replyPlaceholder: "Type message...",
    replySent: "Message sent to client.",
    pending: "Pending",
    noRequests: "No active requests.",
    manualMode: "Manual Wheel",
    manualActive: "Manual Key Active",
    disableManual: "Clear Key",
    resetHome: "Reset All",
    harmonicGuide: "Harmonic Guide",
    fireMode: "Fire Mode (Bangers Only)",
    history: "History",
    sessionLog: "Session Log",
    dashboard: "Dashboard",
    clearHistory: "Clear History",
    viewDj: "DJ View",
    viewClient: "Client View (Preview)",
    clientWelcome: appConfig.clientMessages.welcome,
    clientSubtitle: `¡${appConfig.djName} en vivo!`,
    yourName: appConfig.clientMessages.placeholderName,
    songName: appConfig.clientMessages.placeholderSong,
    sendRequest: appConfig.clientMessages.btnSend,
    yourRequests: "Tus Pedidos",
    reqSent: appConfig.clientMessages.sent,
    statusPending: "Esperando al DJ...",
    statusAccepted: "¡Sonará Pronto!",
    statusRejected: "No disponible / Repetida",
    statusAsking: "DJ pregunta: ¿Info?",
    clientReply: "Responder al DJ",
    online: "En Línea",
    offline: "Modo Local",
    shareLink: "🔗 Link Clientes"
  },
  es: {
    title: `${appConfig.appTitle} - ${appConfig.djName}`,
    subtitle: "Asistente DJ Inteligente",
    nowPlaying: "En el Aire / Entrada en Vivo",
    selectTrack: "Selecciona o usa el Micrófono",
    aiSuggest: "Sugerencia IA",
    thinking: "Analizando la vibra...",
    btnThinking: "Pensando...",
    import: "Importar Base (Reset)",
    importUsb: "Sumar USB / Extra",
    searchPlaceholder: "Buscar en librería...",
    tracksLoaded: "Pistas",
    geminiSuggestion: "Estrategia Gemini",
    recommended: "Mejores Mezclas Compatibles",
    fullLibrary: "Librería Completa",
    perfect: "Mezcla Perfecta",
    harmonic: "Armónica",
    energyBoost: "Subida Energía",
    vibeChange: "Cambio Vibe",
    reason: "¿Por qué?",
    key: "TONO",
    bpm: "BPM",
    energy: "ENRG",
    currentKeyLabel: "Tono Actual",
    alertNoTracks: "No se encontraron pistas válidas. Revisa el CSV (Artista, Título, BPM, Key).",
    listen: "Escuchar en Vivo",
    listening: "Grabando...",
    identifying: "Identificando...",
    identifyError: "No se pudo identificar.",
    matchesFound: "pistas compatibles encontradas",
    filterGenre: "Filtrar por Género/Carpeta",
    allGenres: "Todos los Géneros",
    harmonicOptions: "Opciones Armónicas",
    relMajorMinor: "Relativo Mayor/Menor",
    energyUp: "Subida Energía (+1)",
    energyDown: "Bajada Suave (-1)",
    requestMode: "Solicitud Cliente",
    searchRequest: "Escribe el pedido...",
    requestResults: "Resultados del Pedido",
    exactMatch: "Coincidencia Exacta",
    copied: "¡Copiado al Portapapeles!",
    doubleClickInfo: "Doble clic para copiar",
    exitRequest: "Salir de Solicitudes",
    inbox: "Buzón de Pedidos",
    clearAll: "Limpiar Todo",
    simulate: "Simular Entrada",
    accept: "Aceptar",
    reject: "Rechazar",
    ask: "Preguntar",
    asking: "Preguntando...",
    sendReply: "Enviar",
    quickConfirmArtist: "¿Artista?",
    quickConfirmSong: "¿Canción?",
    quickConfirmVersion: "¿Remix?",
    replyPlaceholder: "Escribe mensaje...",
    replySent: "Mensaje enviado al cliente.",
    pending: "Pendiente",
    noRequests: "Buzón vacío.",
    manualMode: "Rueda / Manual",
    manualActive: "Clave Manual Activa",
    disableManual: "Limpiar Clave",
    resetHome: "Inicio / Reset",
    harmonicGuide: "Guía Armónica",
    fireMode: "Modo Fuego (Solo Energía 8+)",
    history: "Historial",
    sessionLog: "Historial de Sesión",
    dashboard: "Panel DJ",
    clearHistory: "Borrar Historial",
    viewDj: "Vista DJ",
    viewClient: "Vista Cliente (Preview)",
    clientWelcome: appConfig.clientMessages.welcome,
    clientSubtitle: `¡${appConfig.djName} en vivo!`,
    yourName: appConfig.clientMessages.placeholderName,
    songName: appConfig.clientMessages.placeholderSong,
    sendRequest: appConfig.clientMessages.btnSend,
    yourRequests: "Tus Pedidos",
    reqSent: appConfig.clientMessages.sent,
    statusPending: "Esperando al DJ...",
    statusAccepted: "¡Sonará Pronto!",
    statusRejected: "No disponible / Repetida",
    statusAsking: "DJ pregunta: ¿Info?",
    clientReply: "Responder al DJ",
    online: "En Línea",
    offline: "Modo Local",
    shareLink: "🔗 Link Clientes"
  }
};

type Language = 'en' | 'es';
type ViewMode = 'dj' | 'client';

const App: React.FC = () => {
    // Shared State with Firebase
    const [requests, setRequests] = useState<ClientRequest[]>([]);
    const [isOnline, setIsOnline] = useState(false);
    
    // UI State
    const [language, setLanguage] = useState<Language>('es');
    const [viewMode, setViewMode] = useState<ViewMode>('dj');

    // DJ App State
    const [library, setLibrary] = useState<Track[]>(DEMO_TRACKS);
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [filterText, setFilterText] = useState('');
    const [selectedGenre, setSelectedGenre] = useState<string>('All');
    const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // DJ Feature States
    const [playedTracks, setPlayedTracks] = useState<Set<string>>(new Set());
    const [isFireMode, setIsFireMode] = useState(false);
    const [leftTab, setLeftTab] = useState<'dashboard' | 'history'>('dashboard');

    // Request Mode State
    const [isRequestMode, setIsRequestMode] = useState(false);
    const [requestQuery, setRequestQuery] = useState('');
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    
    // Request Reply State
    const [replyingToId, setReplyingToId] = useState<string | null>(null);
    const [customReply, setCustomReply] = useState('');

    // Audio Recording State
    const [isListening, setIsListening] = useState(false);
    const [listenStatus, setListenStatus] = useState<string>('');

    // Right Panel & Manual Key State
    const [showRightPanel, setShowRightPanel] = useState(false);
    const [manualKey, setManualKey] = useState<string | null>(null);

    const t = TRANSLATIONS[language];

    // --- INITIALIZATION EFFECTS ---
    
    // 1. Set Page Title based on Config
    useEffect(() => {
        document.title = `${appConfig.appTitle} - ${appConfig.djName}`;
    }, []);

    // 2. Check URL for Client Mode
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'client') {
            setViewMode('client');
        }
    }, []);

    // 3. Sync Firebase
    useEffect(() => {
        const unsubscribe = subscribeToRequests((syncedRequests) => {
            setRequests(syncedRequests);
            setIsOnline(true);
        });

        // Check if config has API Key to determine online status
        if (!appConfig.firebase.apiKey || appConfig.firebase.apiKey === "") {
            setRequests(DEMO_REQUESTS);
            setIsOnline(false);
        }

        return () => unsubscribe();
    }, []);

    // Add current track to history automatically
    useEffect(() => {
        if (currentTrack) {
            setPlayedTracks(prev => new Set(prev).add(currentTrack.id));
        }
    }, [currentTrack]);

    // Extract unique genres from library
    const genres = useMemo(() => {
        const unique = new Set(library.map(track => track.genre || 'Unknown'));
        return ['All', ...Array.from(unique).sort()];
    }, [library]);

    // Calculate Recommendations
    const recommendations = useMemo(() => {
        if (manualKey) return []; 

        if (!currentTrack) return [];
        
        let recs = library
            .map(t => calculateCompatibility(currentTrack, t))
            .filter((r): r is Recommendation => r !== null);
        
        if (selectedGenre !== 'All') {
            recs = recs.filter(r => r.track.genre === selectedGenre);
        }

        if (isFireMode) {
            recs = recs.filter(r => (r.track.energy || 0) >= 8);
        }

        return recs.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    }, [currentTrack, library, selectedGenre, manualKey, isFireMode]);

    const activeCompatibleKeys = useMemo(() => {
        if (manualKey) return getCompatibleKeys(manualKey);
        if (currentTrack) return getCompatibleKeys(currentTrack.key);
        return [];
    }, [manualKey, currentTrack]);

    const requestMatches = useMemo(() => {
        if (!requestQuery.trim()) return [];
        
        const query = requestQuery.toLowerCase();
        
        const scored = library.map(track => {
            let score = 0;
            const title = track.title.toLowerCase();
            const artist = track.artist.toLowerCase();

            if (title === query || artist === query) {
                score = 100; 
            } else if (title.startsWith(query) || artist.startsWith(query)) {
                score = 80; 
            } else if (title.includes(query) || artist.includes(query)) {
                score = 50; 
            }

            return { track, score };
        });

        return scored
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(item => item.track);

    }, [requestQuery, library]);

    // --- Actions ---
    const handleReset = () => {
        setCurrentTrack(null);
        setManualKey(null);
        setIsRequestMode(false);
        setFilterText('');
        setAiSuggestion(null);
        setSelectedGenre('All');
        setIsFireMode(false);
        setToastMessage(t.resetHome);
        setTimeout(() => setToastMessage(null), 2000);
    };

    const handleClearHistory = () => {
        if (confirm("¿Borrar todo el historial de la sesión?")) {
            setPlayedTracks(new Set());
        }
    };

    const handleCopyClientLink = () => {
        const url = `${window.location.origin}${window.location.pathname}?mode=client`;
        navigator.clipboard.writeText(url).then(() => {
            setToastMessage(`Enlace copiado: ${url}`);
            setTimeout(() => setToastMessage(null), 3000);
        });
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, isAppend: boolean = false) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (text) {
                const parsed = parseCSV(text);
                if (parsed.length > 0) {
                    if (isAppend) {
                        setLibrary(prev => [...prev, ...parsed]);
                        setToastMessage(`${parsed.length} pistas añadidas!`);
                        setTimeout(() => setToastMessage(null), 3000);
                    } else {
                        setLibrary(parsed);
                        setCurrentTrack(null);
                        setAiSuggestion(null);
                        setSelectedGenre('All');
                        setManualKey(null);
                        setPlayedTracks(new Set()); 
                    }
                } else {
                    alert(t.alertNoTracks);
                }
            }
        };
        reader.readAsText(file);
    };

    const getAiSuggestion = async () => {
        if (!currentTrack || recommendations.length === 0) return;
        setIsAnalyzing(true);
        setAiSuggestion(t.thinking);
        const suggestion = await suggestNextTrack(currentTrack, recommendations.slice(0, 10).map(r => r.track));
        setAiSuggestion(suggestion);
        setIsAnalyzing(false);
    };

    const analyzeEnergy = async (track: Track) => {
         const newLib = library.map(t => t.id === track.id ? { ...t, energy: undefined } : t);
         setLibrary(newLib);
         
         const energy = await analyzeTrackEnergy(track);
         setLibrary(prev => prev.map(t => t.id === track.id ? { ...t, energy } : t));
         
         if (currentTrack?.id === track.id) {
             setCurrentTrack(prev => prev ? { ...prev, energy } : null);
         }
    };

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'en' ? 'es' : 'en');
    };

    const copyToClipboard = (track: Track) => {
        const text = `${track.artist} - ${track.title}`;
        navigator.clipboard.writeText(text).then(() => {
            setToastMessage(`${t.copied} "${text}"`);
            setTimeout(() => setToastMessage(null), 3000);
        });
    };

    // --- Request Actions ---
    const handleSimulateRequest = async () => {
        if (isOnline) {
             // Simulate via Cloud DB
             const randomSongs = ["Feid - Online", "Karol G - Online", "Techno - Online"];
             await sendRequestToDb("Simulador Cloud", randomSongs[Math.floor(Math.random() * randomSongs.length)]);
        } else {
             // Local Fallback
             const randomSongs = ["Feid", "Karol G", "Techno", "Reggaeton Old School", "Dua Lipa"];
             const randomNames = ["Sofi", "Carlos", "Andrea", "Pipe", "Valeria"];
             const newReq: ClientRequest = {
                id: `r-${Date.now()}`,
                clientName: randomNames[Math.floor(Math.random() * randomNames.length)],
                songRequest: randomSongs[Math.floor(Math.random() * randomSongs.length)],
                status: 'pending',
                timestamp: Date.now()
             };
             setRequests(prev => [newReq, ...prev]);
        }
        setToastMessage("Nuevo pedido recibido!");
        setTimeout(() => setToastMessage(null), 2000);
    };

    const handleClearRequests = async () => {
        if (window.confirm("¿Vaciar todo el buzón de pedidos?")) {
            if (isOnline) {
                await clearAllRequestsInDb(requests.map(r => r.id));
            } else {
                setRequests([]);
            }
        }
    };

    const handleRemoveRequest = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (isOnline) {
            await deleteRequestInDb(id);
        } else {
            setRequests(prev => prev.filter(r => r.id !== id));
        }
    };

    const handleUpdateRequestStatus = async (id: string, status: RequestStatus, e: React.MouseEvent) => {
        e.stopPropagation();
        if (isOnline) {
            await updateRequestStatusInDb(id, status);
        } else {
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
        }
        const msg = status === 'accepted' ? "Confirmación enviada al cliente" : "Rechazo enviado al cliente";
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2000);
    };

    const toggleReplyMode = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (replyingToId === id) {
            setReplyingToId(null);
        } else {
            setReplyingToId(id);
            setCustomReply('');
        }
    };

    const handleSendReply = async (id: string, message: string) => {
        if (isOnline) {
             await updateRequestStatusInDb(id, 'asking', message);
        } else {
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'asking', reply: message } : r));
        }
        setToastMessage(`${t.replySent}: "${message}"`);
        setReplyingToId(null);
        setTimeout(() => setToastMessage(null), 2500);
    };

    const handleSelectRequest = (query: string) => {
        setRequestQuery(query);
    };

    const getHarmonicNeighbors = (keyStr: string) => {
        const key = parseKey(keyStr);
        if (!key) return null;
        
        const { number, mode } = key;
        const nextNum = number === 12 ? 1 : number + 1;
        const prevNum = number === 1 ? 12 : number - 1;
        const otherMode = mode === CamelotMode.Major ? CamelotMode.Minor : CamelotMode.Major;

        return {
            perfect: `${number}${mode}`,
            energyUp: `${nextNum}${mode}`,
            energyDown: `${prevNum}${mode}`,
            relative: `${number}${otherMode}`
        };
    };

    const activeNeighbors = manualKey 
        ? getHarmonicNeighbors(manualKey) 
        : (currentTrack ? getHarmonicNeighbors(currentTrack.key) : null);

    const handleListen = async () => {
        try {
            setIsListening(true);
            setListenStatus(t.listening);
            setManualKey(null); 
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            const chunks: Blob[] = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                setListenStatus(t.identifying);
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = async () => {
                    const base64data = (reader.result as string).split(',')[1];
                    const identifiedTrack = await identifyTrackFromAudio(base64data);
                    
                    if (identifiedTrack && identifiedTrack.title) {
                        const foundInLib = library.find(t => 
                            t.title.toLowerCase() === identifiedTrack.title?.toLowerCase() ||
                            (t.title.toLowerCase().includes(identifiedTrack.title?.toLowerCase() || '') && t.artist.toLowerCase().includes(identifiedTrack.artist?.toLowerCase() || ''))
                        );
                        const trackToSet = (foundInLib || identifiedTrack) as Track;
                        setCurrentTrack(trackToSet);
                        if (trackToSet.genre && genres.includes(trackToSet.genre)) {
                            setSelectedGenre(trackToSet.genre);
                        }
                        setAiSuggestion(`Detectado: ${trackToSet.title} - ${trackToSet.artist}`);
                    } else {
                        setAiSuggestion(t.identifyError);
                    }
                    
                    setIsListening(false);
                    setListenStatus('');
                    stream.getTracks().forEach(track => track.stop());
                };
            };

            mediaRecorder.start();
            setTimeout(() => {
                if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
            }, 6000);

        } catch (err) {
            console.error("Mic error:", err);
            setIsListening(false);
            setListenStatus('Error: Mic');
        }
    };

    if (viewMode === 'client') {
        return (
            <ClientInterface 
                onSwitchView={() => setViewMode('dj')} 
                t={t}
                onRequestSubmit={async (name, song) => {
                    if (isOnline) {
                        await sendRequestToDb(name, song);
                    } else {
                         const newReq: ClientRequest = {
                            id: `r-${Date.now()}`,
                            clientName: name,
                            songRequest: song,
                            status: 'pending',
                            timestamp: Date.now()
                        };
                        setRequests(prev => [newReq, ...prev]);
                    }
                }}
                requests={requests} 
                isOnline={isOnline}
            />
        );
    }

    // --- MAIN DJ RENDER ---
    return (
        <div className="min-h-screen text-slate-100 flex flex-col h-screen overflow-hidden font-sans relative">
            
            {/* GLOBAL BACKGROUND */}
            <div 
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none grayscale opacity-30"
                style={{ backgroundImage: `url('${appConfig.backgroundImage}')` }}
            ></div>
            <div className="absolute inset-0 z-0 bg-slate-900/80 pointer-events-none"></div>

            {/* TOAST NOTIFICATION */}
            {toastMessage && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
                    <CheckCircle size={16} />
                    <span className="font-bold text-sm">{toastMessage}</span>
                </div>
            )}

            {/* HEADER */}
            <header className={`h-16 border-b flex items-center justify-between px-6 backdrop-blur-md z-20 transition-colors shrink-0 ${isRequestMode ? 'bg-orange-950/80 border-orange-900' : 'bg-slate-800/80 border-slate-700'}`}>
                <div className="flex items-center gap-3">
                     <button onClick={handleReset} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors" title={t.resetHome}>
                        <Home size={20} />
                     </button>
                     <div className="hidden md:flex flex-col">
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
                            {t.title}
                        </h1>
                        <div className={`text-[10px] flex items-center gap-1 font-bold ${isOnline ? 'text-green-400' : 'text-slate-500'}`}>
                            {isOnline ? <Cloud size={10} /> : <CloudOff size={10} />}
                            {isOnline ? t.online : t.offline}
                        </div>
                     </div>
                </div>

                <div className="flex-1 max-w-2xl mx-6">
                    {isRequestMode ? (
                        <div className="relative w-full">
                            <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400" size={18} />
                            <input 
                                type="text" 
                                placeholder={t.searchRequest}
                                value={requestQuery}
                                onChange={(e) => setRequestQuery(e.target.value)}
                                autoFocus
                                className="w-full bg-slate-900 border border-orange-700 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-orange-500 text-white placeholder-slate-500"
                            />
                        </div>
                    ) : (
                        <div className="relative w-full flex items-center gap-2">
                             <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    placeholder={t.searchPlaceholder}
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-500 text-slate-200 placeholder-slate-500"
                                />
                             </div>
                             <div className="text-sm text-slate-400 whitespace-nowrap hidden md:block">
                                {library.length} {t.tracksLoaded}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                     <button 
                         onClick={handleCopyClientLink}
                         className="p-2 rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-2"
                         title="Copiar enlace para clientes"
                     >
                        <Share2 size={18} />
                        <span className="hidden md:inline text-xs">{t.shareLink}</span>
                     </button>

                     <button 
                         onClick={() => setViewMode('client')}
                         className="p-2 rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-2"
                         title="Preview Client App"
                     >
                        <Smartphone size={18} />
                        <span className="hidden md:inline text-xs">{t.viewClient}</span>
                     </button>

                     <button 
                        onClick={() => setIsFireMode(!isFireMode)}
                        className={`p-2 rounded-lg border flex items-center gap-2 transition-all ${isFireMode ? 'bg-orange-600 border-orange-500 text-white animate-pulse shadow-lg shadow-orange-500/50' : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-orange-400'}`}
                        title={t.fireMode}
                    >
                        <Flame size={18} fill={isFireMode ? "currentColor" : "none"} />
                     </button>

                     <button 
                        onClick={() => setShowRightPanel(!showRightPanel)}
                        className={`p-2 rounded-lg border flex items-center gap-2 transition-all ${showRightPanel ? 'bg-purple-900/50 border-purple-500 text-purple-200' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'}`}
                    >
                        <Disc3 size={18} />
                        <span className="hidden md:inline text-sm font-medium">{t.manualMode}</span>
                     </button>

                     <button onClick={toggleLanguage} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300">
                        <Globe size={18} />
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT ROW */}
            <div className="flex-1 flex overflow-hidden z-10">
                
                {/* LEFT PANEL: Controls & Dashboard */}
                <div className="w-80 md:w-96 bg-slate-900/60 p-4 flex flex-col border-r border-slate-700 shadow-xl z-10 overflow-y-auto shrink-0 backdrop-blur-sm">
                    
                    {/* Mode Toggle */}
                    <button 
                        onClick={() => setIsRequestMode(!isRequestMode)}
                        className={`w-full py-2 px-4 mb-4 rounded-lg font-bold flex items-center justify-between transition-all ${isRequestMode ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/50' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                        <span className="flex items-center gap-2">
                            {isRequestMode ? <X size={18} /> : <MessageSquare size={18} />}
                            {isRequestMode ? t.exitRequest : t.requestMode}
                        </span>
                        {isRequestMode && <span className="text-xs bg-black/20 px-2 py-0.5 rounded">ON</span>}
                    </button>

                    {isRequestMode ? (
                        /* REQUEST INBOX */
                        <div className="flex-1 flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-orange-400 flex items-center gap-2 text-sm">
                                    <Inbox size={16} /> {t.inbox} ({requests.length})
                                </h3>
                                <div className="flex gap-2">
                                    <button onClick={handleSimulateRequest} className="p-1.5 bg-slate-700 rounded hover:bg-slate-600 text-slate-300" title={t.simulate}>
                                        <PlusCircle size={14} />
                                    </button>
                                    <button onClick={handleClearRequests} className="p-1.5 bg-red-900/50 rounded hover:bg-red-900 text-red-300" title={t.clearAll}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                {requests.map(req => (
                                    <div 
                                        key={req.id} 
                                        onClick={() => handleSelectRequest(req.songRequest)}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all relative group flex flex-col gap-2
                                            ${req.status === 'accepted' ? 'bg-green-900/20 border-green-500/30' : 
                                              req.status === 'rejected' ? 'bg-red-900/20 border-red-500/30 opacity-60' : 
                                              req.status === 'asking' ? 'bg-yellow-900/20 border-yellow-500/30' :
                                              'bg-slate-700/50 border-slate-600 hover:bg-slate-700'}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col">
                                                <span className="text-orange-300 font-bold text-sm">{req.clientName}</span>
                                                <span className="text-xs text-slate-500">{new Date(req.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            {req.status === 'asking' && (
                                                <span className="text-[10px] bg-yellow-600 text-white px-1.5 py-0.5 rounded-full animate-pulse">{t.asking}</span>
                                            )}
                                        </div>
                                        
                                        <p className="text-white text-sm font-medium">{req.songRequest}</p>
                                        
                                        {/* Action Buttons */}
                                        <div className="flex gap-2 mt-1">
                                            <button onClick={(e) => handleUpdateRequestStatus(req.id, 'accepted', e)} className="p-1.5 bg-slate-800 hover:bg-green-500 hover:text-black rounded text-green-400 transition-colors" title={t.accept}><CheckCircle size={14} /></button>
                                            <button onClick={(e) => handleUpdateRequestStatus(req.id, 'rejected', e)} className="p-1.5 bg-slate-800 hover:bg-red-500 hover:text-white rounded text-red-400 transition-colors" title={t.reject}><XCircle size={14} /></button>
                                            <button onClick={(e) => toggleReplyMode(req.id, e)} className="p-1.5 bg-slate-800 hover:bg-blue-500 hover:text-white rounded text-blue-400 transition-colors" title={t.ask}><HelpCircle size={14} /></button>
                                            <button onClick={(e) => handleRemoveRequest(req.id, e)} className="p-1.5 ml-auto text-slate-500 hover:text-red-400" title="Delete"><X size={14} /></button>
                                        </div>

                                        {/* Reply Panel (Expanded) */}
                                        {replyingToId === req.id && (
                                            <div className="mt-2 bg-slate-800 p-2 rounded border border-slate-600 animate-in slide-in-from-top-2" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                                                    <button onClick={() => handleSendReply(req.id, t.quickConfirmArtist)} className="text-xs bg-slate-700 hover:bg-blue-600 px-2 py-1 rounded text-slate-200 whitespace-nowrap">{t.quickConfirmArtist}</button>
                                                    <button onClick={() => handleSendReply(req.id, t.quickConfirmSong)} className="text-xs bg-slate-700 hover:bg-blue-600 px-2 py-1 rounded text-slate-200 whitespace-nowrap">{t.quickConfirmSong}</button>
                                                    <button onClick={() => handleSendReply(req.id, t.quickConfirmVersion)} className="text-xs bg-slate-700 hover:bg-blue-600 px-2 py-1 rounded text-slate-200 whitespace-nowrap">{t.quickConfirmVersion}</button>
                                                </div>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" 
                                                        placeholder={t.replyPlaceholder}
                                                        value={customReply}
                                                        onChange={(e) => setCustomReply(e.target.value)}
                                                    />
                                                    <button onClick={() => handleSendReply(req.id, customReply)} className="bg-blue-600 hover:bg-blue-500 text-white p-1 rounded">
                                                        <Send size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* MAIN LEFT PANEL TABS */
                        <div className="flex-1 flex flex-col">
                            {/* Tabs Switcher */}
                            <div className="flex p-1 bg-slate-900 rounded-lg mb-4">
                                <button 
                                    onClick={() => setLeftTab('dashboard')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors ${leftTab === 'dashboard' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <LayoutTemplate size={14} /> {t.dashboard}
                                </button>
                                <button 
                                    onClick={() => setLeftTab('history')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors ${leftTab === 'history' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <History size={14} /> {t.history}
                                </button>
                            </div>

                            {leftTab === 'dashboard' ? (
                                <>
                                    {/* Manual Key Indicator */}
                                    {manualKey && (
                                        <div className="mb-4 bg-purple-900/30 border border-purple-500/50 p-3 rounded-lg flex items-center justify-between animate-in slide-in-from-left">
                                            <div className="flex items-center gap-2">
                                                <Disc3 className="text-purple-400" size={18} />
                                                <div>
                                                    <div className="text-xs text-purple-300 uppercase font-bold">{t.manualActive}</div>
                                                    <div className="text-lg font-bold text-white">{manualKey}</div>
                                                </div>
                                            </div>
                                            <button onClick={() => setManualKey(null)} className="text-xs bg-purple-500/20 hover:bg-purple-500/40 text-purple-200 px-2 py-1 rounded">
                                                {t.disableManual}
                                            </button>
                                        </div>
                                    )}

                                     {/* CURRENT TRACK DECK */}
                                    <div className={`bg-slate-900 rounded-xl p-4 border mb-4 shadow-inner relative overflow-hidden transition-all ${isListening ? 'border-red-500' : 'border-slate-700'} ${manualKey ? 'opacity-60 grayscale' : ''}`}>
                                        {currentTrack ? (
                                            <>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">{t.nowPlaying}</span>
                                                    <div className="flex gap-2">
                                                        <button onClick={handleListen} disabled={isListening} className={`text-slate-500 hover:text-red-400 transition-colors ${isListening ? 'text-red-500' : ''}`}>
                                                            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                                                        </button>
                                                        <button onClick={() => setCurrentTrack(null)} className="text-slate-500 hover:text-white"><Zap size={14} /></button>
                                                    </div>
                                                </div>
                                                <h2 className="text-lg font-bold text-white leading-tight truncate">{currentTrack.title}</h2>
                                                <p className="text-sm text-slate-400 truncate mb-3">{currentTrack.artist}</p>
                                                <div className="flex items-center justify-between text-xs font-mono bg-slate-800 p-2 rounded">
                                                    <div className="flex flex-col items-center px-2 border-r border-slate-700 w-1/3">
                                                        <span className="text-slate-500">{t.key}</span>
                                                        <span className="text-lg text-purple-400 font-bold">{currentTrack.key}</span>
                                                    </div>
                                                    <div className="flex flex-col items-center px-2 border-r border-slate-700 w-1/3">
                                                        <span className="text-slate-500">{t.bpm}</span>
                                                        <span className="text-lg text-cyan-400 font-bold">{currentTrack.bpm}</span>
                                                    </div>
                                                    <div className="flex flex-col items-center px-2 w-1/3 cursor-pointer" onClick={() => analyzeEnergy(currentTrack)}>
                                                        <span className="text-slate-500">{t.energy}</span>
                                                        <span className="text-lg text-yellow-400 font-bold">{currentTrack.energy ?? '?'}</span>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="h-28 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-lg">
                                                {isListening ? (
                                                    <div className="text-red-400 animate-pulse flex flex-col items-center">
                                                        <Mic size={24} />
                                                        <span className="text-xs mt-2">{listenStatus}</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Disc size={24} className="mb-2 opacity-50" />
                                                        <button onClick={handleListen} className="text-xs bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded-full text-white flex gap-1">
                                                            <Mic size={12} /> {t.listen}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Genre Selector */}
                                    <div className="space-y-1 mb-4">
                                        <label className="text-xs text-slate-400 flex items-center gap-1">
                                            <FolderOpen size={12} />
                                            {t.filterGenre}
                                        </label>
                                        <select 
                                            value={selectedGenre}
                                            onChange={(e) => setSelectedGenre(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg p-2"
                                        >
                                            <option value="All">{t.allGenres}</option>
                                            {genres.filter(g => g !== 'All').map(g => (
                                                <option key={g} value={g}>{g}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-auto space-y-2">
                                        <button 
                                            onClick={getAiSuggestion}
                                            disabled={!currentTrack || isAnalyzing || manualKey !== null}
                                            className="w-full py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-lg font-bold flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:grayscale"
                                        >
                                            {isAnalyzing ? <Activity className="animate-spin" size={16} /> : <Wand2 size={16} />}
                                            {isAnalyzing ? t.btnThinking : t.aiSuggest}
                                        </button>
                                        
                                        <div className="grid grid-cols-2 gap-2">
                                            <label className="py-2 px-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium flex items-center justify-center gap-1 cursor-pointer border border-slate-600 text-center">
                                                <Upload size={14} />
                                                {t.import}
                                                <input type="file" accept=".csv,.txt" onChange={(e) => handleFileUpload(e, false)} className="hidden" />
                                            </label>
                                            <label className="py-2 px-2 bg-orange-900/40 hover:bg-orange-900/60 text-orange-200 border border-orange-700/50 rounded-lg text-xs font-medium flex items-center justify-center gap-1 cursor-pointer text-center">
                                                <HardDrive size={14} />
                                                {t.importUsb}
                                                <input type="file" accept=".csv,.txt" onChange={(e) => handleFileUpload(e, true)} className="hidden" />
                                            </label>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* HISTORY TAB */
                                <div className="flex-1 flex flex-col">
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <span className="text-xs text-slate-400 font-bold uppercase">{t.sessionLog} ({playedTracks.size})</span>
                                        <button onClick={handleClearHistory} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                                            <Trash2 size={10} /> {t.clearHistory}
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto bg-slate-900/50 rounded-lg border border-slate-700/50 p-2 space-y-1">
                                        {Array.from(playedTracks).length === 0 ? (
                                            <div className="text-center text-slate-600 text-xs py-10 italic">
                                                No tracks played yet.
                                            </div>
                                        ) : (
                                            // Reverse to show newest first, map IDs back to tracks if possible
                                            Array.from(playedTracks).reverse().map(id => {
                                                const track = library.find(t => t.id === id);
                                                if (!track) return null;
                                                return (
                                                    <div key={`hist-${id}`} className="flex items-center gap-2 p-2 rounded bg-slate-800/50 border border-slate-700/30 text-xs text-slate-400">
                                                        <Clock size={12} />
                                                        <div className="truncate">
                                                            <span className="font-bold text-slate-300">{track.title}</span>
                                                            <span className="mx-1">-</span>
                                                            <span>{track.artist}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* CENTER PANEL: Track Browser */}
                <div className="flex-1 flex flex-col bg-slate-950/70 relative backdrop-blur-sm">
                    {/* AI Suggestion Box */}
                    {!isRequestMode && aiSuggestion && (
                        <div className="m-4 mb-0 p-3 bg-indigo-900/30 border border-indigo-500/30 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
                             <Wand2 size={16} className="text-indigo-400 mt-1" />
                             <p className="text-sm text-indigo-100 italic">{aiSuggestion}</p>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
                        {isRequestMode ? (
                            /* REQUEST RESULTS */
                            <div>
                                 <h3 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
                                    <MessageSquare size={20} /> {t.requestResults}
                                </h3>
                                <div className="grid gap-2">
                                    {requestMatches.length > 0 ? requestMatches.map(t => (
                                        <TrackRow 
                                            key={t.id} 
                                            track={t} 
                                            onClick={() => setCurrentTrack(t)}
                                            onDoubleClick={() => copyToClipboard(t)}
                                            t={t}
                                            isRequestResult={true}
                                            query={requestQuery}
                                            isPlayed={playedTracks.has(t.id)}
                                        />
                                    )) : (
                                        <div className="text-center text-slate-500 py-10">{t.searchRequest}</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* MAIN TRACK LIST */
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <ListFilter size={20} className={manualKey ? 'text-purple-500' : isFireMode ? 'text-orange-500' : 'text-green-500'} />
                                        {manualKey ? `Manual Filter: ${manualKey}` : isFireMode ? t.fireMode : t.recommended} 
                                        {selectedGenre !== 'All' && (
                                            <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded border border-blue-500/20 ml-2">
                                                {selectedGenre}
                                            </span>
                                        )}
                                    </h3>
                                </div>
                                
                                <div className="grid gap-2">
                                    {manualKey ? (
                                        library
                                            .filter(track => selectedGenre === 'All' || track.genre === selectedGenre)
                                            .filter(track => track.title.toLowerCase().includes(filterText.toLowerCase()) || track.artist.toLowerCase().includes(filterText.toLowerCase()))
                                            .filter(track => !isFireMode || (track.energy || 0) >= 8)
                                            .map(track => {
                                                const isCompatible = activeCompatibleKeys.includes(track.key);
                                                return (
                                                    <TrackRow 
                                                        key={track.id}
                                                        track={track}
                                                        onClick={() => {
                                                            setCurrentTrack(track);
                                                        }}
                                                        onDoubleClick={() => copyToClipboard(track)}
                                                        t={t}
                                                        isDimmed={!isCompatible}
                                                        isPlayed={playedTracks.has(track.id)}
                                                    />
                                                )
                                            })
                                    ) : (currentTrack && recommendations.length > 0) ? (
                                        recommendations.map((rec) => (
                                            <TrackRow 
                                                key={rec.track.id} 
                                                track={rec.track} 
                                                recommendation={rec} 
                                                onClick={() => setCurrentTrack(rec.track)}
                                                onDoubleClick={() => copyToClipboard(rec.track)}
                                                t={t}
                                                isPlayed={playedTracks.has(rec.track.id)}
                                            />
                                        ))
                                    ) : (
                                        library
                                            .filter(t => t.title.toLowerCase().includes(filterText.toLowerCase()) || t.artist.toLowerCase().includes(filterText.toLowerCase()))
                                            .filter(track => !isFireMode || (track.energy || 0) >= 8)
                                            .map(t => (
                                            <TrackRow 
                                                key={t.id} 
                                                track={t} 
                                                onClick={() => setCurrentTrack(t)}
                                                onDoubleClick={() => copyToClipboard(t)}
                                                t={t}
                                                isPlayed={playedTracks.has(t.id)}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL: Camelot Wheel & Harmonic Guide */}
                {showRightPanel && (
                    <div className="w-96 bg-slate-900/80 border-l border-slate-700 p-4 flex flex-col shrink-0 animate-in slide-in-from-right duration-300 shadow-2xl z-30 overflow-y-auto backdrop-blur-md">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-200">{t.manualMode}</h3>
                            <button onClick={() => setShowRightPanel(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
                        </div>
                        
                        <div className="flex-1 flex flex-col items-center">
                            <CamelotWheel 
                                currentKey={manualKey || (currentTrack ? currentTrack.key : null)} 
                                onKeySelect={(key) => {
                                    setManualKey(key);
                                }}
                                compatibleKeys={activeCompatibleKeys}
                                currentKeyLabel={manualKey ? t.manualActive : t.currentKeyLabel}
                            />
                            
                            <div className="mt-8 text-center px-4 w-full">
                                {manualKey ? (
                                    <div className="animate-in fade-in slide-in-from-bottom-4">
                                        <div className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider border-b border-slate-700 pb-2">{t.harmonicGuide}</div>
                                        {activeNeighbors && (
                                            <div className="grid grid-cols-1 gap-3 text-left">
                                                <div className="bg-slate-800/80 p-3 rounded-lg border-l-4 border-green-500 flex justify-between items-center">
                                                    <span className="text-sm text-slate-300">{t.perfect}</span>
                                                    <span className="text-xl font-bold text-white">{activeNeighbors.perfect}</span>
                                                </div>
                                                <div className="bg-slate-800/80 p-3 rounded-lg border-l-4 border-pink-500 flex justify-between items-center">
                                                    <span className="text-sm text-slate-300">{t.energyUp}</span>
                                                    <span className="text-xl font-bold text-white">{activeNeighbors.energyUp}</span>
                                                </div>
                                                <div className="bg-slate-800/80 p-3 rounded-lg border-l-4 border-blue-400 flex justify-between items-center">
                                                    <span className="text-sm text-slate-300">{t.energyDown}</span>
                                                    <span className="text-xl font-bold text-white">{activeNeighbors.energyDown}</span>
                                                </div>
                                                <div className="bg-slate-800/80 p-3 rounded-lg border-l-4 border-indigo-500 flex justify-between items-center">
                                                    <span className="text-sm text-slate-300">{t.relMajorMinor}</span>
                                                    <span className="text-xl font-bold text-white">{activeNeighbors.relative}</span>
                                                </div>
                                            </div>
                                        )}
                                         <button 
                                            onClick={() => setManualKey(null)}
                                            className="mt-6 text-sm text-slate-400 hover:text-white underline decoration-slate-600"
                                        >
                                            {t.disableManual}
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500">
                                        Selecciona una nota en la rueda para ver sus combinaciones armónicas.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

// --- CLIENT INTERFACE COMPONENT ---
interface ClientInterfaceProps {
    onSwitchView: () => void;
    t: any;
    onRequestSubmit: (name: string, song: string) => void;
    requests: ClientRequest[];
    isOnline: boolean;
}

const ClientInterface: React.FC<ClientInterfaceProps> = ({ onSwitchView, t, onRequestSubmit, requests, isOnline }) => {
    const [name, setName] = useState('');
    const [song, setSong] = useState('');
    const [isSent, setIsSent] = useState(false);
    const [showNequi, setShowNequi] = useState(false);

    // Filter requests to show only "mine" (simulated by name)
    const myRequests = useMemo(() => {
        if (!name) return [];
        return requests.filter(r => r.clientName.toLowerCase() === name.toLowerCase());
    }, [requests, name]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name && song) {
            onRequestSubmit(name, song);
            setSong('');
            setIsSent(true);
            setTimeout(() => setIsSent(false), 3000);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center font-sans overflow-x-hidden relative" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
             {/* STYLE BLOCK FOR CUSTOM CSS provided by user */}
             <style>{`
                body { 
                    background-color: #050505; 
                    background-image: url('${appConfig.backgroundImage}');
                    background-size: cover;
                    background-position: center;
                    background-attachment: fixed;
                }
                body::before {
                    content: "";
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.85); /* Overlay oscuro para legibilidad */
                    z-index: -1;
                }
                .dj-name { font-family: 'Orbitron', sans-serif; letter-spacing: 3px; text-shadow: 0 0 20px ${appConfig.theme.primaryColor}, 0 0 40px ${appConfig.theme.primaryColor}; color: #fff; }
                .status-badge { background: rgba(17, 17, 17, 0.8); color: ${appConfig.theme.primaryColor}; border: 1px solid ${appConfig.theme.primaryColor}; backdrop-filter: blur(5px); }
                .dot { width: 8px; height: 8px; background: ${appConfig.theme.primaryColor}; border-radius: 50%; animation: blink 1s infinite; }
                .request-card { background: rgba(20, 20, 20, 0.85); border: 1px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.9); backdrop-filter: blur(15px); }
                .client-input { background: rgba(0, 0, 0, 0.6); border: 1px solid #444; color: #fff; font-family: 'Rajdhani', sans-serif; }
                .client-input:focus { border-color: ${appConfig.theme.primaryColor}; background: rgba(0,0,0,0.9); }
                .btn-send { background: linear-gradient(90deg, ${appConfig.theme.primaryColor}, ${appConfig.theme.secondaryColor}); box-shadow: 0 5px 15px rgba(255, 0, 76, 0.3); }
                .response-card { background: rgba(0, 210, 255, 0.1); border-left: 4px solid ${appConfig.theme.secondaryColor}; animation: slideIn 0.3s ease; }
                .response-title { color: ${appConfig.theme.secondaryColor}; }
                .nequi-btn { background: #20002c; border: 1px solid #da0081; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
                @keyframes blink { 0%, 100% {opacity:1;} 50% {opacity:0.3;} }
                @keyframes slideIn { from {opacity:0; transform: translateY(10px);} to {opacity:1; transform: translateY(0);} }
             `}</style>

            <button onClick={onSwitchView} className="absolute top-4 right-4 z-50 text-xs bg-gray-800 px-3 py-1 rounded text-gray-400 opacity-50 hover:opacity-100">
                {t.viewDj}
            </button>

            {/* Logo Area */}
            <div className="w-full flex flex-col items-center mt-6 mb-8 text-center z-10">
                {appConfig.logoUrl ? (
                    <img src={appConfig.logoUrl} alt={appConfig.djName} className="h-20 mb-2 object-contain" />
                ) : (
                    <div className="dj-name text-3xl md:text-4xl text-white uppercase font-bold mb-2">{appConfig.djName}</div>
                )}
                <div className="status-badge text-[11px] font-bold px-3 py-1 rounded-full inline-flex items-center gap-2">
                    <div className="dot"></div> {appConfig.clientMessages.subtitle}
                </div>
            </div>

            {/* Response Area */}
            <div className="w-full max-w-[350px] flex flex-col gap-3 mb-6 px-4 z-10">
                {myRequests.filter(req => req.status !== 'pending').map(req => (
                    <div key={req.id} className="response-card p-4 rounded-r-lg">
                        <div className="response-title text-xs font-bold mb-1 flex justify-between">
                            <span>RESPUESTA DEL DJ</span>
                        </div>
                        <div className="text-[15px] font-bold text-white mb-2">🎵 {req.songRequest}</div>
                        <div className="text-sm text-gray-300 bg-black/30 p-2 rounded">
                            {req.reply || (req.status === 'accepted' ? "¡Solicitud aceptada!" : "No disponible por ahora.")}
                        </div>
                    </div>
                ))}
            </div>

            {/* Request Card */}
            <div className="request-card rounded-2xl p-6 w-full max-w-[350px] mb-6 mx-4 z-10">
                <form onSubmit={handleSubmit}>
                    <div className="mb-5 w-full">
                        <label className="block text-gray-400 mb-2 text-sm font-bold uppercase">{t.yourName}</label>
                        <input 
                            type="text" 
                            className="client-input w-full p-4 text-lg rounded-lg outline-none transition-all"
                            placeholder={appConfig.clientMessages.placeholderName}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-6 w-full">
                        <label className="block text-gray-400 mb-2 text-sm font-bold uppercase">{t.songName}</label>
                        <input 
                            type="text" 
                            className="client-input w-full p-4 text-lg rounded-lg outline-none transition-all"
                            placeholder={appConfig.clientMessages.placeholderSong}
                            value={song}
                            onChange={(e) => setSong(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn-send w-full text-white py-4 text-lg font-bold uppercase tracking-wider rounded-lg cursor-pointer transform active:scale-95 transition-transform border-none">
                        {isSent ? appConfig.clientMessages.sending : appConfig.clientMessages.btnSend}
                    </button>
                    {isSent && <div className="text-[#ff004c] text-center mt-3 font-bold">{appConfig.clientMessages.sent}</div>}
                </form>
            </div>

            {/* Donation Area */}
            <div className="text-center mt-2 w-full max-w-[350px] z-10 px-4 pb-8">
                <button onClick={() => setShowNequi(true)} className="nequi-btn w-full text-white py-3 rounded-lg font-bold text-[15px] cursor-pointer flex items-center justify-center gap-2">
                    <span>📲 Apoya al DJ ({appConfig.paymentInfo.providerName})</span>
                </button>
                <div className="mt-4 text-[#aaa] text-[11px]">© {appConfig.djName} {appConfig.clientMessages.copyright}</div>
            </div>

            {/* Nequi Modal */}
            {showNequi && (
                <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-5" onClick={() => setShowNequi(false)}>
                    <div className="bg-white text-[#20002c] rounded-2xl p-8 text-center max-w-[300px] w-full relative" onClick={(e) => e.stopPropagation()}>
                        <div className="absolute top-2 right-4 text-2xl font-bold text-[#da0081] cursor-pointer" onClick={() => setShowNequi(false)}>×</div>
                        <h2 className="m-0 text-[#da0081] text-2xl font-bold">{appConfig.paymentInfo.message}</h2>
                        <p className="text-sm my-4">Copia el número</p>
                        
                        <span className="block bg-gray-200 p-3 rounded-lg font-mono text-xl font-bold text-black mb-4 select-all">
                            {appConfig.paymentInfo.number}
                        </span>
                        
                        <button className="bg-[#da0081] text-white border-none py-2 px-5 rounded-full font-bold cursor-pointer" onClick={() => setShowNequi(false)}>
                            Listo, Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- TRACK ROW COMPONENT ---
interface TrackRowProps {
    track: Track;
    recommendation?: Recommendation;
    onClick: () => void;
    onDoubleClick?: () => void;
    t: any;
    isRequestResult?: boolean;
    query?: string;
    isDimmed?: boolean;
    isPlayed?: boolean;
}

const TrackRow: React.FC<TrackRowProps> = ({ track, recommendation, onClick, onDoubleClick, t, isRequestResult, query, isDimmed, isPlayed }) => {
    
    let borderClass = "border-slate-800 hover:border-slate-600";
    let bgClass = "bg-slate-800 hover:bg-slate-750";
    let opacityClass = isDimmed ? "opacity-30 grayscale hover:opacity-100 hover:grayscale-0" : "opacity-100";
    
    // Logic for played tracks visual style
    if (isPlayed) {
        opacityClass = "opacity-40 grayscale";
    }

    const getTranslatedMixType = (type: string) => {
        if (type === 'Perfect') return t.perfect;
        if (type === 'Harmonic') return t.harmonic;
        if (type === 'Energy Boost') return t.energyBoost;
        return t.vibeChange;
    };

    if (recommendation && !isDimmed) {
        if (recommendation.mixType === 'Perfect') borderClass = "border-green-500/50 shadow-[0_0_10px_-5px_rgba(34,197,94,0.3)]";
        if (recommendation.mixType === 'Harmonic') borderClass = "border-cyan-500/50 shadow-[0_0_10px_-5px_rgba(6,182,212,0.3)]";
        if (recommendation.mixType === 'Energy Boost') borderClass = "border-pink-500/50 shadow-[0_0_10px_-5px_rgba(236,72,153,0.3)]";
    }

    if (isRequestResult && query) {
        const exact = track.title.toLowerCase() === query.toLowerCase() || track.artist.toLowerCase() === query.toLowerCase();
        if (exact) {
             borderClass = "border-orange-500 shadow-md shadow-orange-900/40";
             bgClass = "bg-orange-950/40";
        }
    }

    // Highlighting for Manual Mode (if not dimmed)
    if (!isDimmed && !recommendation && !isRequestResult) {
         // Default highlight for visible tracks in manual mode
         borderClass = "border-slate-600";
    }

    return (
        <div 
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            className={`flex items-center p-3 rounded-lg border ${borderClass} ${bgClass} ${opacityClass} cursor-pointer transition-all duration-300 group relative overflow-hidden select-none`}
        >
            {/* Strip Indicators */}
            {recommendation && !isDimmed && (
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    recommendation.mixType === 'Perfect' ? 'bg-green-500' :
                    recommendation.mixType === 'Harmonic' ? 'bg-cyan-500' : 'bg-pink-500'
                }`}></div>
            )}
            
            <div className="w-10 h-10 rounded bg-slate-700 flex items-center justify-center text-slate-400 mr-4 shrink-0 shadow-inner relative">
                <Music size={20} />
                {isPlayed && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded backdrop-blur-[1px]">
                        <CheckCircle size={16} className="text-slate-300" />
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0 mr-4">
                <h4 className={`font-bold truncate group-hover:text-white transition-colors ${isPlayed ? 'text-slate-500 line-through decoration-2 decoration-slate-600' : 'text-slate-200'}`}>{track.title}</h4>
                <p className="text-xs text-slate-400 truncate">{track.artist}</p>
                {recommendation && !isDimmed && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ml-[-2px] mt-1 inline-block bg-slate-900/50 text-slate-300 border border-slate-700">
                        {getTranslatedMixType(recommendation.mixType)}
                    </span>
                )}
            </div>

            {/* Metrics */}
            <div className="flex items-center gap-4 text-right">
                <div className="w-12">
                     <div className="text-[10px] text-slate-500 uppercase">{t.bpm}</div>
                     <div className={`font-mono font-bold ${recommendation && Math.abs(track.bpm - 128) < 3 ? 'text-green-400' : 'text-cyan-400'}`}>{track.bpm}</div>
                </div>
                <div className="w-12">
                     <div className="text-[10px] text-slate-500 uppercase">{t.key}</div>
                     <div className={`font-mono font-bold ${!isDimmed && !isRequestResult ? 'text-purple-400' : 'text-slate-400'}`}>{track.key}</div>
                </div>
                <div className="w-8">
                    <div className="text-[10px] text-slate-500 uppercase">En</div>
                    <div className={`font-mono font-bold ${isPlayed ? 'text-slate-600' : (track.energy || 0) >= 8 ? 'text-orange-500' : 'text-yellow-500'}`}>{track.energy ?? '-'}</div>
                </div>
            </div>
        </div>
    );
};

export default App;
