export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  balance: number;
  adsWatchedToday: number;
  totalAdsWatched: number;
  lastAdResetAt: any; // Firestore Timestamp
  isBanned: boolean;
  isAdmin: boolean;
  createdAt: any; // Firestore Timestamp
  lastLoginDeviceId?: string;
}

export interface AppConfig {
  monetagAdUnitId: string;
  minWithdrawal: number;
  rewardPerAd: number;
  dailyAdLimit: number;
  adTimerSeconds: number;
  telegramLink?: string;
  facebookLink?: string;
  announcement?: string;
}

export interface WithdrawalRequest {
  id?: string;
  uid: string;
  email: string;
  amount: number;
  method: 'bKash' | 'Nagad';
  number: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any; // Firestore Timestamp
}
