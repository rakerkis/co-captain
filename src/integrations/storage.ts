// Simple localStorage wrapper for the app

export const localStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  },

  setItem: (key: string, value: string): void => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  },

  removeItem: (key: string): void => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  },

  clear: (): void => {
    if (typeof window === "undefined") return;
    window.localStorage.clear();
  },
};

export default localStorage;
