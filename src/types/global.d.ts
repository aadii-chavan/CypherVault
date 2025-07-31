import { User } from 'firebase/auth';

declare global {
  interface Window {
    /**
     * Current authenticated Firebase user, stored globally for panic mode access
     */
    cypherVaultCurrentUser: User | null;
  }
}

export {}; 