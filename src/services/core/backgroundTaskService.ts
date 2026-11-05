// Long-running work the app-wide banner reports on. Module-level so a task outlives the screen that started it.
export type BackgroundTaskTone = 'success' | 'info' | 'error';

export type BackgroundTask =
    // `hidden`: the user tapped the banner away; its result still shows.
    | { id: string; status: 'running'; label: string; detail?: string; hidden?: boolean }
    | { id: string; status: 'done'; tone: BackgroundTaskTone; message: string };

const DONE_VISIBLE_MS = 4000;

let tasks: BackgroundTask[] = [];
const listeners = new Set<(tasks: BackgroundTask[]) => void>();
const doneTimers = new Map<string, ReturnType<typeof setTimeout>>();

const emit = (next: BackgroundTask[]) => {
    tasks = next;
    listeners.forEach(l => l(next));
};

const clearDoneTimer = (id: string) => {
    clearTimeout(doneTimers.get(id));
    doneTimers.delete(id);
};

export const getBackgroundTasks = () => tasks;

export const subscribeBackgroundTasks = (listener: (tasks: BackgroundTask[]) => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
};

export const isBackgroundTaskRunning = (id: string) => tasks.some(t => t.id === id && t.status === 'running');

// Returns false (and changes nothing) when a task with this id is already running.
export const startBackgroundTask = (id: string, label: string, detail?: string): boolean => {
    if (isBackgroundTaskRunning(id)) return false;
    clearDoneTimer(id);
    emit([...tasks.filter(t => t.id !== id), { id, status: 'running', label, detail }]);
    return true;
};

export const hideBackgroundTask = (id: string) => {
    emit(tasks.map(t => (t.id === id && t.status === 'running' ? { ...t, hidden: true } : t)));
};

export const showBackgroundTask = (id: string) => {
    emit(tasks.map(t => (t.id === id && t.status === 'running' ? { ...t, hidden: false } : t)));
};

// Swaps the task for its result, which stays visible for a few seconds.
export const finishBackgroundTask = (id: string, tone: BackgroundTaskTone, message: string) => {
    clearDoneTimer(id);
    emit(tasks.map(t => (t.id === id ? { id, status: 'done', tone, message } : t)));
    doneTimers.set(id, setTimeout(() => {
        doneTimers.delete(id);
        emit(tasks.filter(t => t.id !== id));
    }, DONE_VISIBLE_MS));
};
