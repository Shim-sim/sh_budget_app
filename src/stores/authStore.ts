import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { SECURE_STORE_KEY } from '../api/client';

interface AuthState {
  memberId: number | null;
  isLoggedIn: boolean;
  isLoading: boolean;

  login: (memberId: number) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  memberId: null,
  isLoggedIn: false,
  isLoading: true,

  login: async (memberId: number) => {
    await SecureStore.setItemAsync(SECURE_STORE_KEY.MEMBER_ID, String(memberId));
    set({ memberId, isLoggedIn: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY.MEMBER_ID);
    set({ memberId: null, isLoggedIn: false });
  },

  loadFromStorage: async () => {
    const stored = await SecureStore.getItemAsync(SECURE_STORE_KEY.MEMBER_ID);
    if (stored) {
      set({ memberId: Number(stored), isLoggedIn: true, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },
}));
