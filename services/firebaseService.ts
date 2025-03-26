import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  DocumentData,
  QueryConstraint,
  onSnapshot,
  Unsubscribe,
  serverTimestamp,
  Timestamp,
  DocumentReference,
  DocumentSnapshot,
  CollectionReference,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Timestamp utility 
export const getServerTimestamp = () => serverTimestamp();

// Create a document with a specific ID
export const createDocumentWithId = async <T>(
  collectionPath: string,
  id: string,
  data: T
): Promise<void> => {
  const docRef = doc(db, collectionPath, id);
  await setDoc(docRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

// Create a document with auto-generated ID
export const createDocument = async <T>(
  collectionPath: string,
  data: T
): Promise<string> => {
  const collectionRef = collection(db, collectionPath);
  const docRef = await addDoc(collectionRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

// Get a document by ID
export const getDocument = async <T>(
  collectionPath: string,
  id: string
): Promise<T | null> => {
  const docRef = doc(db, collectionPath, id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as T;
  } else {
    return null;
  }
};

// Update a document
export const updateDocument = async <T>(
  collectionPath: string,
  id: string,
  data: Partial<T>
): Promise<void> => {
  const docRef = doc(db, collectionPath, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

// Delete a document
export const deleteDocument = async (
  collectionPath: string,
  id: string
): Promise<void> => {
  const docRef = doc(db, collectionPath, id);
  await deleteDoc(docRef);
};

// Query documents
export const queryDocuments = async <T>(
  collectionPath: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> => {
  const collectionRef = collection(db, collectionPath);
  const q = query(collectionRef, ...constraints);
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as T[];
};

// Listen to document changes
export const listenToDocument = <T>(
  collectionPath: string,
  id: string,
  callback: (data: T | null) => void
): Unsubscribe => {
  const docRef = doc(db, collectionPath, id);
  
  return onSnapshot(docRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
      callback({ id: docSnapshot.id, ...docSnapshot.data() } as T);
    } else {
      callback(null);
    }
  });
};

// Listen to collection changes
export const listenToCollection = <T>(
  collectionPath: string,
  constraints: QueryConstraint[] = [],
  callback: (data: T[]) => void
): Unsubscribe => {
  const collectionRef = collection(db, collectionPath);
  const q = query(collectionRef, ...constraints);
  
  return onSnapshot(q, (querySnapshot) => {
    const documents = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
    
    callback(documents);
  });
};

// Helpers for query constraints
export { where, orderBy, limit }; 