import { create } from 'zustand';
import { storage, } from '../utils/storage';
import { SECURE_STORE_KEY } from '../api/client';

interface AuthState {
  memberId: number | null;
  selectedBookId: number | null;
  isLoggedIn: boolean;
  isLoading: boolean;

  login: (memberId: number) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
  selectBook: (bookId: number | null) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  memberId: null,
  selectedBookId: null,
  isLoggedIn: false,
  isLoading: true,

  login: async (memberId: number) => {
    await storage.setItem(SECURE_STORE_KEY.MEMBER_ID, String(memberId));
    set({ memberId, isLoggedIn: true });
  },

  logout: async () => {
    await storage.deleteItem(SECURE_STORE_KEY.MEMBER_ID);
    await storage.deleteItem(SECURE_STORE_KEY.SELECTED_BOOK_ID);
    set({ memberId: null, selectedBookId: null, isLoggedIn: false });
  },

  loadFromStorage: async () => {
    try {
      const stored = await storage.getItem(SECURE_STORE_KEY.MEMBER_ID);
      const storedBookId = await storage.getItem(SECURE_STORE_KEY.SELECTED_BOOK_ID);
      if (stored) {
        set({
          memberId: Number(stored),
          selectedBookId: storedBookId ? Number(storedBookId) : null,
          isLoggedIn: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  selectBook: async (bookId: number | null) => {
    if (bookId !== null) {
      await storage.setItem(SECURE_STORE_KEY.SELECTED_BOOK_ID, String(bookId));
    } else {
      await storage.deleteItem(SECURE_STORE_KEY.SELECTED_BOOK_ID);
    }
    set({ selectedBookId: bookId });
  },
}));
