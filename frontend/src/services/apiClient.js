const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function apiGet(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json', ...options.headers },
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Permintaan gagal dengan status ${response.status}.`);
  }

  return response.json();
}

export async function apiPost(path, body, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...options.headers },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!response.ok) throw new Error(`Permintaan gagal dengan status ${response.status}.`);
  return response.json();
}
