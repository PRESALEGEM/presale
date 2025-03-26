import {
  ref,
  set,
  push,
  get,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
  onValue,
  off,
  DatabaseReference,
  DataSnapshot
} from 'firebase/database';
import { realtimeDb } from '../config/firebase';

// Save data with a specific ID
export const setData = async <T>(
  path: string,
  id: string,
  data: T
): Promise<void> => {
  const dbRef = ref(realtimeDb, `${path}/${id}`);
  await set(dbRef, {
    ...data,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
};

// Save data with auto-generated ID
export const pushData = async <T>(
  path: string,
  data: T
): Promise<string> => {
  const dbRef = ref(realtimeDb, path);
  const newRef = push(dbRef);
  await set(newRef, {
    ...data,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return newRef.key || '';
};

// Get data once by ID
export const getData = async <T>(
  path: string,
  id: string
): Promise<T | null> => {
  const dbRef = ref(realtimeDb, `${path}/${id}`);
  const snapshot = await get(dbRef);
  
  if (snapshot.exists()) {
    return { id, ...snapshot.val() } as T;
  } else {
    return null;
  }
};

// Get all data from a path
export const getAllData = async <T>(
  path: string
): Promise<T[]> => {
  const dbRef = ref(realtimeDb, path);
  const snapshot = await get(dbRef);
  
  if (snapshot.exists()) {
    const data: T[] = [];
    snapshot.forEach((childSnapshot) => {
      data.push({
        id: childSnapshot.key,
        ...childSnapshot.val(),
      } as T);
    });
    return data;
  } else {
    return [];
  }
};

// Update data by ID
export const updateData = async <T>(
  path: string,
  id: string,
  data: Partial<T>
): Promise<void> => {
  const dbRef = ref(realtimeDb, `${path}/${id}`);
  await update(dbRef, {
    ...data,
    updatedAt: Date.now(),
  });
};

// Delete data by ID
export const deleteData = async (
  path: string,
  id: string
): Promise<void> => {
  const dbRef = ref(realtimeDb, `${path}/${id}`);
  await remove(dbRef);
};

// Query data by a specific field
export const queryByField = async <T>(
  path: string,
  field: string,
  value: string | number | boolean
): Promise<T[]> => {
  const dbRef = ref(realtimeDb, path);
  const queryRef = query(dbRef, orderByChild(field), equalTo(value));
  const snapshot = await get(queryRef);
  
  if (snapshot.exists()) {
    const data: T[] = [];
    snapshot.forEach((childSnapshot) => {
      data.push({
        id: childSnapshot.key,
        ...childSnapshot.val(),
      } as T);
    });
    return data;
  } else {
    return [];
  }
};

// Listen to data changes
export const listenToData = <T>(
  path: string,
  id: string,
  callback: (data: T | null) => void
): () => void => {
  const dbRef = ref(realtimeDb, `${path}/${id}`);
  
  const listener = onValue(dbRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id, ...snapshot.val() } as T);
    } else {
      callback(null);
    }
  });
  
  // Return unsubscribe function
  return () => off(dbRef);
};

// Listen to multiple data changes
export const listenToCollection = <T>(
  path: string,
  callback: (data: T[]) => void
): () => void => {
  const dbRef = ref(realtimeDb, path);
  
  const listener = onValue(dbRef, (snapshot) => {
    if (snapshot.exists()) {
      const data: T[] = [];
      snapshot.forEach((childSnapshot) => {
        data.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
        } as T);
      });
      callback(data);
    } else {
      callback([]);
    }
  });
  
  // Return unsubscribe function
  return () => off(dbRef);
}; 