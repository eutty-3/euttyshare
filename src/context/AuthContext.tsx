import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, signInWithGoogle, signInAsGuest, logOut } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginGoogle: () => Promise<void>;
  loginGuest: () => Promise<void>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginGoogle: async () => {},
  loginGuest: async () => {},
  logoutUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            await setDoc(userRef, {
              email: currentUser.email || 'guest@campus.local',
              displayName: currentUser.displayName || (currentUser.isAnonymous ? 'Lab Station Guest' : 'Campus User'),
              photoURL: currentUser.photoURL || '',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              role: currentUser.isAnonymous ? 'guest' : 'student',
            });
          } else {
            await setDoc(userRef, {
              updatedAt: serverTimestamp(),
            }, { merge: true });
          }
        } catch (err) {
          console.warn('Firestore user profile sync notice:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loginGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      throw err;
    }
  };

  const loginGuest = async () => {
    try {
      await signInAsGuest();
    } catch (err: any) {
      console.error('Guest Sign-In error:', err);
      throw err;
    }
  };

  const logoutUser = async () => {
    try {
      await logOut();
    } catch (err: any) {
      console.error('Logout error:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginGoogle, loginGuest, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
};
