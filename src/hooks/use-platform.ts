import { Capacitor } from "@capacitor/core";

export function usePlatform() {
  const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
  return {
    isIOS: platform === "ios",
    isAndroid: platform === "android",
    isNative: Capacitor.isNativePlatform(),
    isWeb: platform === "web",
  };
}
