import "@testing-library/jest-native/extend-expect";

// Expo 53 "winter" runtime shim so Jest doesn't try to resolve import.meta bundles
Object.defineProperty(globalThis as any, "__ExpoImportMetaRegistry", {
  value: { getValue: () => undefined },
  configurable: true,
});
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
