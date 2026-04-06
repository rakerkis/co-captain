// Secure storage wrapper:
// - iOS/Android: uses the device Keychain / Keystore via capacitor-secure-storage-plugin
// - Web: falls back to plain localStorage (no better option without a backend account)

import { Capacitor } from "@capacitor/core";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";

const isNative = Capacitor.isNativePlatform();

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (isNative) {
      try {
        const { value } = await SecureStoragePlugin.get({ key });
        return value;
      } catch {
        return null; // key not found
      }
    }
    return window.localStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isNative) {
      await SecureStoragePlugin.set({ key, value });
      return;
    }
    window.localStorage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (isNative) {
      try {
        await SecureStoragePlugin.remove({ key });
      } catch {
        // key may not exist
      }
      return;
    }
    window.localStorage.removeItem(key);
  },
};

export default secureStorage;
