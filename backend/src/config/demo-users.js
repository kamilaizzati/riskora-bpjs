/**
 * Demo Users Configuration
 * Exclusively intended for local demonstration and development.
 * Automatically disabled in production environments.
 */

const DEMO_USERS = Object.freeze([
  {
    id: 'usr_verificator_01',
    name: 'BPJS Claim Verificator',
    email: 'verifikator@riskora.id',
    password: 'password123',
    role: 'VERIFICATOR'
  },
  {
    id: 'usr_casemix_01',
    name: 'Admin Casemix Sardjito',
    email: 'casemix@sardjito.co.id',
    password: 'password123',
    role: 'CASEMIX_ADMIN'
  }
]);

/**
 * Checks whether demo accounts are permitted to be used.
 * Strictly disallowed if NODE_ENV === 'production'.
 */
function isDemoAllowed() {
  return process.env.NODE_ENV !== 'production';
}

/**
 * Returns available demo accounts. Returns empty array in production.
 */
function getDemoUsers() {
  if (!isDemoAllowed()) {
    return [];
  }
  return DEMO_USERS;
}

/**
 * Validates credentials against demo users.
 * Performs safe case-insensitive email match and exact password match.
 * @param {string} email
 * @param {string} password
 * @returns {object|null} user record without password, or null
 */
function findDemoUser(email, password) {
  if (!email || !password) return null;
  const users = getDemoUsers();
  const normalizedEmail = String(email).trim().toLowerCase();

  const user = users.find(
    (u) => u.email.toLowerCase() === normalizedEmail && u.password === password
  );

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

/**
 * Finds demo user by ID.
 * @param {string} id
 * @returns {object|null} user record without password, or null
 */
function findDemoUserById(id) {
  if (!id) return null;
  const users = getDemoUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

module.exports = {
  DEMO_USERS,
  isDemoAllowed,
  getDemoUsers,
  findDemoUser,
  findDemoUserById
};
