import AsyncStorage from '@react-native-async-storage/async-storage';

export interface QueuedOperation {
    id: string;
    table: string;
    type: 'insert' | 'update' | 'delete';
    data: any;
    timestamp: number;
    retryCount: number;
}

const QUEUE_KEY = 'pending-operations';

/**
 * Get all pending operations from the offline queue.
 */
export async function getQueue(): Promise<QueuedOperation[]> {
    try {
        const raw = await AsyncStorage.getItem(QUEUE_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

/**
 * Add an operation to the offline queue.
 */
export async function enqueue(op: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const queue = await getQueue();
    queue.push({
        ...op,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
    });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Remove a completed operation from the queue.
 */
export async function dequeue(opId: string): Promise<void> {
    const queue = await getQueue();
    const newQueue = queue.filter((op) => op.id !== opId);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
}

/**
 * Update retry count for a failed operation.
 */
export async function markRetry(opId: string): Promise<void> {
    const queue = await getQueue();
    const newQueue = queue.map((op) => {
        if (op.id === opId) {
            return { ...op, retryCount: op.retryCount + 1 };
        }
        return op;
    });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
}

/**
 * Process all pending operations.
 * Returns the number of successfully processed operations.
 */
export async function processQueue(
    executor: (op: QueuedOperation) => Promise<boolean>
): Promise<number> {
    const queue = await getQueue();
    let processed = 0;

    for (const op of queue) {
        if (op.retryCount >= 5) {
            // Too many retries — remove from queue
            await dequeue(op.id);
            continue;
        }

        try {
            const success = await executor(op);
            if (success) {
                await dequeue(op.id);
                processed++;
            } else {
                await markRetry(op.id);
            }
        } catch {
            await markRetry(op.id);
        }
    }

    return processed;
}

/**
 * Clear the entire queue.
 */
export async function clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
}
