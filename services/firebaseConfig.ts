
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, updateDoc, doc, query, orderBy, deleteDoc, writeBatch } from "firebase/firestore";
import { ClientRequest, RequestStatus } from "../types";
import { appConfig } from "../config";

// --- CONFIGURACIÓN ---
// Leemos la configuración directamente del archivo de Marca Blanca (config.ts)
const firebaseConfig = {
  apiKey: appConfig.firebase.apiKey,
  authDomain: appConfig.firebase.authDomain,
  projectId: appConfig.firebase.projectId,
  storageBucket: appConfig.firebase.storageBucket,
  messagingSenderId: appConfig.firebase.messagingSenderId,
  appId: appConfig.firebase.appId
};

// Singleton pattern para la instancia de DB
let db: any = null;

const getDB = () => {
    if (db) return db;
    // Solo inicializar si hay config válida
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "") {
        try {
            const app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            return db;
        } catch (e) {
            console.warn("Error inicializando Firebase (credenciales inválidas en config.ts):", e);
            return null;
        }
    }
    return null;
};

// --- SERVICIOS ---

// 1. Escuchar pedidos en tiempo real (Para el DJ)
export const subscribeToRequests = (callback: (requests: ClientRequest[]) => void) => {
    const database = getDB();
    if (!database) {
        console.log("Modo Offline/Demo: Firebase no configurado en config.ts");
        return () => {}; // No-op unsubscribe
    }

    const q = query(collection(database, "requests"), orderBy("timestamp", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
        const reqs: ClientRequest[] = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(reqs);
    }, (error: any) => {
        console.error("Error suscribiendo a pedidos:", error);
    });

    return unsubscribe;
};

// 2. Enviar un nuevo pedido (Para el Cliente)
export const sendRequestToDb = async (clientName: string, songRequest: string): Promise<boolean> => {
    const database = getDB();
    if (!database) return false; // Fallback a modo local en UI

    try {
        await addDoc(collection(database, "requests"), {
            clientName,
            songRequest,
            status: 'pending',
            timestamp: Date.now()
        });
        return true;
    } catch (e) {
        console.error("Error enviando pedido:", e);
        return false;
    }
};

// 3. Actualizar estado (Aceptar/Rechazar/Preguntar) y guardar respuesta opcional
export const updateRequestStatusInDb = async (id: string, status: RequestStatus, reply?: string) => {
    const database = getDB();
    if (!database) return;

    const ref = doc(database, "requests", id);
    const data: any = { status };
    if (reply !== undefined) {
        data.reply = reply;
    }
    
    await updateDoc(ref, data);
};

// 4. Eliminar pedido individual
export const deleteRequestInDb = async (id: string) => {
    const database = getDB();
    if (!database) return;

    await deleteDoc(doc(database, "requests", id));
};

// 5. Limpiar todo el buzón (Batch delete)
export const clearAllRequestsInDb = async (ids: string[]) => {
    const database = getDB();
    if (!database) return;

    const batch = writeBatch(database);
    ids.forEach(id => {
        const ref = doc(database, "requests", id);
        batch.delete(ref);
    });
    await batch.commit();
};
