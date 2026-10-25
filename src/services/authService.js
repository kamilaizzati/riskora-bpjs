const ACCOUNTS_KEY = 'riskora_mock_accounts';
const SESSION_KEY = 'riskora_mock_session';

export const demoAccounts = {
  verificator: {
    email: 'verifikator@riskora.id',
    password: 'password123',
    role: 'verificator',
    name: 'Verifikator BPJS',
    organization: 'BPJS Kesehatan',
  },
  faskes: {
    email: 'casemix@sardjito.co.id',
    password: 'password123',
    role: 'faskes',
    name: 'Tim Casemix',
    displayName: 'Tim Casemix',
    organization: 'RSUP Dr. Sardjito',
    facilityId: 'facility-001',
    facilityName: 'RSUP Dr. Sardjito',
  },
};

function readRegisteredAccounts() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

export async function signIn({ email, password, role }) {
  await new Promise((resolve) => setTimeout(resolve, 450));
  const accounts = [...Object.values(demoAccounts), ...readRegisteredAccounts()];
  const account = accounts.find(
    (item) => item.role === role && item.email.toLowerCase() === email.trim().toLowerCase() && item.password === password,
  );

  if (!account) throw new Error('Email, kata sandi, atau peran tidak sesuai dengan akun demo.');

  const session = {
    email: account.email,
    role: account.role,
    name: account.name,
    displayName: account.displayName || account.name,
    organization: account.organization,
    facilityId: account.facilityId || null,
    facilityName: account.facilityName || account.organization || null,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function registerFaskes({ name, email, organization, password }) {
  await new Promise((resolve) => setTimeout(resolve, 450));
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = [...Object.values(demoAccounts), ...readRegisteredAccounts()];
  if (accounts.some((account) => account.email.toLowerCase() === normalizedEmail)) {
    throw new Error('Alamat email tersebut sudah terdaftar.');
  }

  const registered = readRegisteredAccounts();
  registered.push({ name, email: normalizedEmail, organization, password, role: 'faskes' });
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(registered));
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
}
