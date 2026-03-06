import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 3001;

function getDevHost(): string | null {
    // In Expo dev, hostUri is usually like "192.168.1.5:8081"
    const hostUri = Constants.expoConfig?.hostUri;
    if (!hostUri) return null;
    return hostUri.split(':')[0] ?? null;
}

function getApiBaseUrl(): string {
    // Allow overriding for tunnel / production
    const envUrl = (process.env.EXPO_PUBLIC_API_BASE_URL || '').trim();
    if (envUrl) return envUrl.replace(/\/$/, '');

    // Defaults for local development
    if (Platform.OS === 'android') {
        // Android emulator can reach host machine via 10.0.2.2
        if (!Constants.isDevice) return `http://10.0.2.2:${API_PORT}`;

        // Real device must use your PC's LAN IP
        const devHost = getDevHost();
        if (devHost) return `http://${devHost}:${API_PORT}`;
    }

    if (Platform.OS === 'ios') return `http://localhost:${API_PORT}`;
    return `http://localhost:${API_PORT}`;
}

const API_BASE = getApiBaseUrl();

const TOKEN_KEY = 'auth_token';
const REQUEST_TIMEOUT_MS = 15000;

// Token management
async function getToken(): Promise<string | null> {
    try {
        if (Platform.OS === 'web') {
            return localStorage.getItem(TOKEN_KEY);
        }
        const promise = SecureStore.getItemAsync(TOKEN_KEY);
        const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));
        return await Promise.race([promise, timeout]);
    } catch {
        return null;
    }
}

async function setToken(token: string): Promise<void> {
    try {
        if (Platform.OS === 'web') {
            localStorage.setItem(TOKEN_KEY, token);
            return;
        }
        const promise = SecureStore.setItemAsync(TOKEN_KEY, token);
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000));
        await Promise.race([promise, timeout]);
    } catch {
        console.warn('Failed to save token');
    }
}

async function removeToken(): Promise<void> {
    try {
        if (Platform.OS === 'web') {
            localStorage.removeItem(TOKEN_KEY);
            return;
        }
        const promise = SecureStore.deleteItemAsync(TOKEN_KEY);
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000));
        await Promise.race([promise, timeout]);
    } catch {
        console.warn('Failed to remove token');
    }
}

// Unified fetch helper
async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
    const token = await getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutMsg = `Request timed out. Make sure your API server is reachable at ${API_BASE} (set EXPO_PUBLIC_API_BASE_URL if needed).`;

    const fetchPromise = fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
            controller.abort();
            reject(new Error(timeoutMsg));
        }, REQUEST_TIMEOUT_MS);
    });

    let response: Response;
    try {
        response = await Promise.race([fetchPromise, timeoutPromise]);
    } catch (err: any) {
        if (err.message === timeoutMsg) {
            throw err;
        }

        const isAbort =
            err?.name === 'AbortError' ||
            `${err?.message ?? ''}`.toLowerCase().includes('aborted');

        if (isAbort) {
            throw new Error(timeoutMsg);
        }
        throw new Error(
            `Network error. Make sure your API server is reachable at ${API_BASE}. (${err?.message ?? 'unknown error'})`
        );
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data;
}

// ============ AUTH API ============

export const auth = {
    signUp: async (email: string, password: string, name: string) => {
        const data = await apiFetch('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password, name }),
        });
        await setToken(data.token);
        return { user: data.user, token: data.token };
    },

    signIn: async (email: string, password: string) => {
        const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        await setToken(data.token);
        return { user: data.user, token: data.token };
    },

    signOut: async () => {
        await removeToken();
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
        return await apiFetch('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword }),
        });
    },

    deleteAccount: async () => {
        const result = await apiFetch('/auth/account', {
            method: 'DELETE',
        });
        await removeToken();
        return result;
    },

    getUser: async () => {
        try {
            const user = await apiFetch('/auth/me');
            return user;
        } catch {
            return null;
        }
    },

    getSession: async () => {
        const token = await getToken();
        if (!token) return null;
        try {
            const user = await apiFetch('/auth/me');
            return { token, user };
        } catch {
            await removeToken();
            return null;
        }
    },

    updateProfile: async (updates: Record<string, any>) => {
        return await apiFetch('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    },
};

// ============ RUNS API ============

export const runsApi = {
    getAll: async () => {
        return await apiFetch('/runs');
    },

    save: async (runData: any) => {
        return await apiFetch('/runs', {
            method: 'POST',
            body: JSON.stringify(runData),
        });
    },

    updateNotes: async (id: string, notes: string) => {
        return await apiFetch(`/runs/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ notes }),
        });
    },

    delete: async (id: string) => {
        return await apiFetch(`/runs/${id}`, {
            method: 'DELETE',
        });
    },
};

// ============ GOALS API ============

export const goalsApi = {
    getAll: async () => {
        return await apiFetch('/goals');
    },

    create: async (goalData: any) => {
        return await apiFetch('/goals', {
            method: 'POST',
            body: JSON.stringify(goalData),
        });
    },

    update: async (id: string, updates: any) => {
        return await apiFetch(`/goals/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    },

    delete: async (id: string) => {
        return await apiFetch(`/goals/${id}`, {
            method: 'DELETE',
        });
    },
};

// ============ ACHIEVEMENTS API ============

export const achievementsApi = {
    getAll: async () => {
        return await apiFetch('/achievements');
    },

    create: async (badge_type: string) => {
        return await apiFetch('/achievements', {
            method: 'POST',
            body: JSON.stringify({ badge_type }),
        });
    },
};

// ============ SHOES API ============

export const shoesApi = {
    getAll: async () => {
        return await apiFetch('/shoes');
    },

    create: async (shoeData: { name: string; brand: string; max_km?: number }) => {
        return await apiFetch('/shoes', {
            method: 'POST',
            body: JSON.stringify(shoeData),
        });
    },

    update: async (id: string, updates: any) => {
        return await apiFetch(`/shoes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    },

    delete: async (id: string) => {
        return await apiFetch(`/shoes/${id}`, {
            method: 'DELETE',
        });
    },

    retire: async (id: string) => {
        return await apiFetch(`/shoes/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ is_active: false }),
        });
    },
};

// ============ SYSTEM API ============
export const systemApi = {
    getStatus: async () => {
        return await apiFetch('/status');
    },
    getHealth: async () => {
        return await apiFetch('/health');
    },
};
