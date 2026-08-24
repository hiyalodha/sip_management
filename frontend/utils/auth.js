// Small helpers around localStorage-based auth state

export function saveSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

// Merge partial fields (e.g. { firstName, lastName }) into the cached user object
export function updateUser(partial) {
  const current = getUser();
  if (!current) return;
  const updated = { ...current, ...partial };
  localStorage.setItem('user', JSON.stringify(updated));
  return updated;
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function isAuthenticated() {
  return !!getToken();
}
