import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  updatePassword, 
  updateEmail, 
  User, 
  UserCredential,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously
} from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// Create a new user
export const registerUser = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return user;
  } catch (error) {
    console.error("Error registering user:", error);
    throw error;
  }
};

// Sign in user
export const signInUser = async (email: string, password: string): Promise<UserCredential> => {
  return signInWithEmailAndPassword(auth, email, password);
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<UserCredential> => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  
  // Check if user document exists in Firestore
  const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
  
  // If not, create it
  if (!userDoc.exists()) {
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email: userCredential.user.email,
      displayName: userCredential.user.displayName || null,
      photoURL: userCredential.user.photoURL || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  
  return userCredential;
};

// Sign in anonymously
export const signInAnon = async (): Promise<UserCredential> => {
  try {
    const credential = await signInAnonymously(auth);
    
    // Create a basic user document for anonymous users
    await setDoc(doc(db, 'users', credential.user.uid), {
      isAnonymous: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    return credential;
  } catch (error) {
    console.error("Error with anonymous sign in:", error);
    throw error;
  }
};

// Sign out
export const logoutUser = async (): Promise<void> => {
  return signOut(auth);
};

// Reset password
export const resetPassword = async (email: string): Promise<void> => {
  return sendPasswordResetEmail(auth, email);
};

// Update user email
export const updateUserEmail = async (user: User, newEmail: string): Promise<void> => {
  await updateEmail(user, newEmail);
  await setDoc(doc(db, 'users', user.uid), {
    email: newEmail,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

// Update user password
export const updateUserPassword = async (user: User, newPassword: string): Promise<void> => {
  return updatePassword(user, newPassword);
};

// Get current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Listen to auth state changes
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
}; 