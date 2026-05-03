import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  where,
  increment,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from './config';
import { UserProfile, AppConfig, WithdrawalRequest } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- User Services ---
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

export async function createUserProfile(profile: UserProfile) {
  const path = `users/${profile.uid}`;
  try {
    await setDoc(doc(db, 'users', profile.uid), {
      ...profile,
      createdAt: serverTimestamp(),
      lastAdResetAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function recordAdWatch(uid: string, reward: number) {
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      balance: increment(reward),
      adsWatchedToday: increment(1),
      totalAdsWatched: increment(1)
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function resetDailyLimit(uid: string) {
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      adsWatchedToday: 0,
      lastAdResetAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// --- Config Services ---
export async function getAppConfig(): Promise<AppConfig | null> {
  const path = 'config/settings';
  try {
    const docRef = doc(db, 'config', 'settings');
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      // Initialize with defaults if empty
      const defaults: AppConfig = {
        monetagAdUnitId: '2849746', // Updated from your screenshot
        minWithdrawal: 200,
        rewardPerAd: 0.10,
        dailyAdLimit: 400,
        adTimerSeconds: 15
      };
      // Only admin can write, so this might fail if called by user.
      // Better to check if doc exists and return defaults if not, but admin should set it.
      return defaults;
    }
    return docSnap.data() as AppConfig;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

export async function updateAppConfig(config: AppConfig) {
  const path = 'config/settings';
  try {
    await setDoc(doc(db, 'config', 'settings'), config);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// --- Withdrawal Services ---
export async function createWithdrawalRequest(req: Omit<WithdrawalRequest, 'id' | 'createdAt'>) {
  const path = 'withdrawals';
  try {
    const newDocRef = doc(collection(db, 'withdrawals'));
    await setDoc(newDocRef, {
      ...req,
      createdAt: serverTimestamp()
    });
    
    // Deduct balance
    const userRef = doc(db, 'users', req.uid);
    await updateDoc(userRef, {
      balance: increment(-req.amount)
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeToUserWithdrawals(uid: string, callback: (reqs: WithdrawalRequest[]) => void) {
  const path = 'withdrawals';
  const q = query(
    collection(db, 'withdrawals'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const reqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WithdrawalRequest));
    callback(reqs);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, path);
  });
}

// --- Admin Services ---
export function subscribeToAllWithdrawals(callback: (reqs: WithdrawalRequest[]) => void) {
  const path = 'withdrawals';
  const q = query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const reqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WithdrawalRequest));
    callback(reqs);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, path);
  });
}

export async function updateWithdrawalStatus(id: string, status: WithdrawalRequest['status'], uid?: string, amount?: number) {
  const path = `withdrawals/${id}`;
  try {
    const ref = doc(db, 'withdrawals', id);
    await updateDoc(ref, { status });
    
    // If rejected, refund the balance to the user
    if (status === 'rejected' && uid && amount) {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        balance: increment(amount)
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function toggleUserBan(uid: string, isBanned: boolean) {
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { isBanned });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// --- Support Functions ---

export async function sendMessage(uid: string, text: string, sender: 'user' | 'admin' | 'ai', profile?: UserProfile) {
  const ticketPath = `support/${uid}`;
  const messagesPath = `support/${uid}/messages`;
  
  try {
    const ticketRef = doc(db, 'support', uid);
    const messagesRef = collection(db, 'support', uid, 'messages');

    // 1. Create or Update Ticket Summary
    const ticketSnap = await getDoc(ticketRef);
    if (!ticketSnap.exists() && profile) {
      await setDoc(ticketRef, {
        uid,
        userEmail: profile.email,
        userName: profile.displayName || 'User',
        lastMessage: text,
        status: sender === 'admin' ? 'replied' : 'open',
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });
    } else {
      await updateDoc(ticketRef, {
        lastMessage: text,
        status: sender === 'admin' ? 'replied' : 'open',
        updatedAt: serverTimestamp()
      });
    }

    // 2. Add Message
    await addDoc(messagesRef, {
      text,
      sender,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, messagesPath);
  }
}

export function subscribeToMessages(uid: string, callback: (messages: any[]) => void) {
  const q = query(
    collection(db, 'support', uid, 'messages')
    // Remove server-side orderBy to prevent hiding pending (null) timestamps
  );

  return onSnapshot(q, (snapshot) => {
    // Sort locally so new messages appear instantly even if their timestamp is pending
    const messages = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })).sort((a: any, b: any) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
      return timeA - timeB;
    });
    callback(messages);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, `support/${uid}/messages`);
  });
}

export function subscribeToAllSupportTickets(callback: (tickets: any[]) => void) {
  const q = query(
    collection(db, 'support'),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'support');
  });
}

export function subscribeToAllUsers(callback: (users: UserProfile[]) => void) {
  const path = 'users';
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(d => ({ ...d.data() } as UserProfile));
    callback(users);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, path);
  });
}
