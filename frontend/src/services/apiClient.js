const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function parseErrorMessage(response) {
  try {
    const errorJson = await response.json();
    return errorJson.error?.message || errorJson.message || `Permintaan gagal dengan status ${response.status}.`;
  } catch {
    return `Permintaan gagal dengan status ${response.status}.`;
  }
}

export async function apiGet(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: { Accept: 'application/json', ...options.headers },
    signal: options.signal,
  });

  if (!response.ok) {
    const msg = await parseErrorMessage(response);
    throw new Error(msg);
  }

  return response.json();
}

export async function apiPost(path, body, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...options.headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    signal: options.signal,
  });

  if (!response.ok) {
    const msg = await parseErrorMessage(response);
    throw new Error(msg);
  }

  return response.json();
}

export async function apiPatch(path, body, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...options.headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    signal: options.signal,
  });

  if (!response.ok) {
    const msg = await parseErrorMessage(response);
    throw new Error(msg);
  }

  return response.json();
}

export async function apiDelete(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { Accept: 'application/json', ...options.headers },
    signal: options.signal,
  });

  if (!response.ok) {
    const msg = await parseErrorMessage(response);
    throw new Error(msg);
  }

  return response.json();
}
