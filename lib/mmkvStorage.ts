import { StateStorage } from 'zustand/middleware';
import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV();

export const mmkvStorage: StateStorage = {
    setItem: (name: string, value: string) => {
        return storage.set(name, value);
    },
    getItem: (name: string) => {
        const value = storage.getString(name);
        return value ?? null;
    },
    removeItem: (name: string) => {
        return storage.remove(name);
    },
};
