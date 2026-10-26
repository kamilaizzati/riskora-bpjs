import { apiPost } from './apiClient';

const ACCOUNTS_KEY = 'riskora_mock_accounts';
const SESSION_KEY = 'riskora_mock_session';
const useMockApi = import.meta.env.VITE_USE_MOCK_API === 'true';

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
  if (!useMockApi) {
    try {
      const res = await apiPost('/api/auth/login', { email: email.trim(), password });
      const user = res.data || res.user || res;
      const isVerificator = user.role === 'VERIFICATOR' || user.role === 'verificator';
      const mappedRole = isVerificator ? 'verificator' : 'faskes';

      if (role && role !== mappedRole) {
        throw new Error(`Peran akun (${mappedRole === 'verificator' ? 'Verifikator BPJS' : 'Faskes Casemix'}) tidak sesuai dengan peran yang dipilih.`);
      }

      const session = {
        email: user.email,
        role: mappedRole,
        name: user.name || (isVerificator ? 'Verifikator BPJS' : 'Tim Casemix Sardjito'),
        displayName: user.name || (isVerificator ? 'Verifikator BPJS' : 'Tim Casemix'),
        organization: isVerificator ? 'BPJS Kesehatan' : 'RSUP Dr. Sardjito',
        facilityId: isVerificator ? null : 'FASKES-001',
        facilityName: isVerificator ? null : 'RSUP Dr. Sardjito',
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    } catch (apiError) {
      // If error is invalid credentials or connection issue
      if (apiError.message && !apiError.message.includes('status 404')) {
        throw apiError;
      }
    }
  }

  // Fallback / Mock authentication mode
  await new Promise((resolve) => setTimeout(resolve, 300));
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
  await new Promise((resolve) => setTimeout(resolve, 300));
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
  if (!useMockApi) {
    apiPost('/api/auth/logout', {}).catch(() => {});
  }
  localStorage.removeItem(SESSION_KEY);
}
