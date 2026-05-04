const QUEUE_KEY = 'offline_queue';

export function getAll() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function enqueue(entry) {
  const queue = getAll();
  queue.push(entry);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function remove(index) {
  const queue = getAll();
  queue.splice(index, 1);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function dequeue() {
  const queue = getAll();
  if (queue.length === 0) return null;
  const entry = queue.shift();
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return entry;
}

export function clear() {
  localStorage.removeItem(QUEUE_KEY);
}
