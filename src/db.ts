import { 
  collection as fsCollection, 
  doc as fsDoc, 
  addDoc as fsAddDoc, 
  updateDoc as fsUpdateDoc, 
  deleteDoc as fsDeleteDoc, 
  setDoc as fsSetDoc, 
  getDoc as fsGetDoc, 
  getDocFromCache,
  getDocFromServer as fsGetDocFromServer,
  query as fsQuery, 
  where as fsWhere, 
  orderBy as fsOrderBy, 
  onSnapshot as fsOnSnapshot,
  serverTimestamp as fsServerTimestamp,
  DocumentReference,
  CollectionReference,
  Query,
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore';
import { db as firestore } from './firebase';

// --- Drop-in Replacements ---
export const db = firestore;

export const collection = (db: any, path: string) => fsCollection(db, path);
export const doc = (db: any, path: string, id: string) => fsDoc(db, path, id);

export const addDoc = async (collRef: CollectionReference, data: any) => {
  const docRef = await fsAddDoc(collRef, data);
  return { id: docRef.id };
};

export const updateDoc = async (docRef: DocumentReference, data: any) => {
  await fsUpdateDoc(docRef, data);
};

export const deleteDoc = async (docRef: DocumentReference) => {
  await fsDeleteDoc(docRef);
};

export const setDoc = async (docRef: DocumentReference, data: any, options?: any) => {
  if (options) {
    await fsSetDoc(docRef, data, options);
  } else {
    await fsSetDoc(docRef, data);
  }
};

export const getDoc = async (docRef: DocumentReference) => {
  const snapshot = await fsGetDoc(docRef);
  return {
    exists: () => snapshot.exists(),
    data: () => snapshot.data()
  };
};

export const getDocFromServer = async (docRef: DocumentReference) => {
  const snapshot = await fsGetDocFromServer(docRef);
  return {
    exists: () => snapshot.exists(),
    data: () => snapshot.data()
  };
};

export const query = (collRef: CollectionReference, ...queryConstraints: any[]) => {
  return fsQuery(collRef, ...queryConstraints);
};

export const where = (field: string, op: any, val: any) => fsWhere(field, op, val);
export const orderBy = (field: string, dir: 'asc' | 'desc') => fsOrderBy(field, dir);

export const onSnapshot = (
  target: Query | DocumentReference, 
  callback: (snapshot: any) => void, 
  onError: (err: any) => void
) => {
  return fsOnSnapshot(target as any, (snapshot: QuerySnapshot | DocumentSnapshot) => {
    if ('docs' in snapshot) {
      // It's a QuerySnapshot
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        data: () => d.data()
      }));
      callback({ docs });
    } else {
      // It's a DocumentSnapshot
      callback({
        exists: () => snapshot.exists(),
        data: () => snapshot.data()
      });
    }
  }, onError);
};

export const serverTimestamp = fsServerTimestamp;

