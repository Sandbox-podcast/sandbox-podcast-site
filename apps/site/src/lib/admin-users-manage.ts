import {
  adminDisplayNameSchema,
  adminLoginSchema,
  adminRoleSchema,
  type AdminRole,
  type AdminUser,
} from '../domain/admin-users.ts';
import {
  ADMIN_PASSWORD_MAX_LENGTH,
  ADMIN_PASSWORD_MIN_LENGTH,
  hashAdminPassword,
} from './admin-auth-db.ts';
import {
  countActiveAdmins,
  createDatabaseAdmin,
  databaseAdminMode,
  databaseAdminRecordById,
  databaseAdminRecordByLogin,
  listDatabaseAdmins,
  updateDatabaseAdmin,
  updateDatabaseAdminPassword,
} from './admin-users-store.ts';

export type AdminUserManageErrorCode =
  | 'forbidden'
  | 'unavailable'
  | 'not_found'
  | 'duplicate_login'
  | 'invalid_input'
  | 'last_admin'
  | 'self_lockout';

export class AdminUserManageError extends Error {
  readonly code: AdminUserManageErrorCode;

  constructor(code: AdminUserManageErrorCode, message: string) {
    super(message);
    this.name = 'AdminUserManageError';
    this.code = code;
  }
}

function secretReady(): boolean {
  return (process.env['SITE_ADMIN_SECRET'] ?? '').length >= 32;
}

export async function adminCanManageUsers(actor: AdminUser): Promise<boolean> {
  return secretReady() && actor.role === 'admin' && (await databaseAdminMode());
}

async function requireManager(actor: AdminUser): Promise<void> {
  if (!(await adminCanManageUsers(actor))) {
    throw new AdminUserManageError(
      'forbidden',
      'La gestion des comptes est réservée aux administrateurs en base.',
    );
  }
}

function parsePassword(password: string): string {
  if (password.length < ADMIN_PASSWORD_MIN_LENGTH || password.length > ADMIN_PASSWORD_MAX_LENGTH) {
    throw new AdminUserManageError(
      'invalid_input',
      `Le mot de passe doit contenir entre ${String(ADMIN_PASSWORD_MIN_LENGTH)} et ${String(ADMIN_PASSWORD_MAX_LENGTH)} caractères.`,
    );
  }
  return password;
}

async function assertKeepsActiveAdmin(options: {
  target: AdminUser;
  nextRole?: AdminRole;
  nextActive?: boolean;
}): Promise<void> {
  const nextRole = options.nextRole ?? options.target.role;
  const nextActive = options.nextActive ?? options.target.active;
  const wasActiveAdmin = options.target.active && options.target.role === 'admin';
  const staysActiveAdmin = nextActive && nextRole === 'admin';
  if (!wasActiveAdmin || staysActiveAdmin) return;
  if ((await countActiveAdmins()) <= 1) {
    throw new AdminUserManageError(
      'last_admin',
      'Impossible de retirer le dernier administrateur actif.',
    );
  }
}

export async function listManagedAdminUsers(actor: AdminUser): Promise<AdminUser[]> {
  await requireManager(actor);
  return listDatabaseAdmins();
}

export async function createManagedAdminUser(
  actor: AdminUser,
  input: { username: string; displayName: string; role: AdminRole; password: string },
): Promise<AdminUser> {
  await requireManager(actor);
  const usernameResult = adminLoginSchema.safeParse(input.username);
  if (!usernameResult.success) {
    throw new AdminUserManageError(
      'invalid_input',
      'Identifiant invalide : minuscules, chiffres ou tirets, 3 à 32 caractères, commence par une lettre.',
    );
  }
  const displayResult = adminDisplayNameSchema.safeParse(input.displayName);
  if (!displayResult.success) {
    throw new AdminUserManageError('invalid_input', 'Le nom affiché est invalide.');
  }
  const roleResult = adminRoleSchema.safeParse(input.role);
  if (!roleResult.success) {
    throw new AdminUserManageError('invalid_input', 'Rôle inconnu.');
  }
  const password = parsePassword(input.password);
  const existing = await databaseAdminRecordByLogin(usernameResult.data);
  if (existing) {
    throw new AdminUserManageError(
      'duplicate_login',
      existing.active
        ? 'Cet identifiant est déjà utilisé.'
        : 'Cet identifiant appartient à un compte désactivé. Réactivez-le plutôt que d’en créer un autre.',
    );
  }
  const created = await createDatabaseAdmin({
    username: usernameResult.data,
    displayName: displayResult.data,
    role: roleResult.data,
    passwordHash: hashAdminPassword(password),
  });
  return {
    id: created.id,
    username: created.username,
    displayName: created.displayName,
    role: created.role,
    active: created.active,
  };
}

export async function updateManagedAdminUser(
  actor: AdminUser,
  id: string,
  patch: { displayName?: string; role?: AdminRole; active?: boolean },
): Promise<AdminUser> {
  await requireManager(actor);
  const target = await databaseAdminRecordById(id);
  if (!target) throw new AdminUserManageError('not_found', 'Compte introuvable.');

  const next: { displayName?: string; role?: AdminRole; active?: boolean } = {};
  if (patch.displayName !== undefined) {
    const displayResult = adminDisplayNameSchema.safeParse(patch.displayName);
    if (!displayResult.success) {
      throw new AdminUserManageError('invalid_input', 'Le nom affiché est invalide.');
    }
    next.displayName = displayResult.data;
  }
  if (patch.role !== undefined) {
    const roleResult = adminRoleSchema.safeParse(patch.role);
    if (!roleResult.success) {
      throw new AdminUserManageError('invalid_input', 'Rôle inconnu.');
    }
    next.role = roleResult.data;
  }
  if (patch.active !== undefined) next.active = patch.active;

  if (actor.id === target.id && next.active === false) {
    throw new AdminUserManageError(
      'self_lockout',
      'Vous ne pouvez pas désactiver votre propre compte.',
    );
  }
  if (
    actor.id === target.id &&
    next.role !== undefined &&
    next.role !== 'admin' &&
    target.role === 'admin'
  ) {
    throw new AdminUserManageError(
      'self_lockout',
      'Vous ne pouvez pas retirer votre propre rôle d’administrateur.',
    );
  }

  await assertKeepsActiveAdmin({
    target,
    ...(next.role !== undefined ? { nextRole: next.role } : {}),
    ...(next.active !== undefined ? { nextActive: next.active } : {}),
  });

  const updated = await updateDatabaseAdmin(id, next);
  if (!updated) throw new AdminUserManageError('not_found', 'Compte introuvable.');
  return {
    id: updated.id,
    username: updated.username,
    displayName: updated.displayName,
    role: updated.role,
    active: updated.active,
  };
}

export async function resetManagedAdminPassword(
  actor: AdminUser,
  id: string,
  password: string,
): Promise<AdminUser> {
  await requireManager(actor);
  const target = await databaseAdminRecordById(id);
  if (!target) throw new AdminUserManageError('not_found', 'Compte introuvable.');
  if (!target.active) {
    throw new AdminUserManageError(
      'invalid_input',
      'Réactivez le compte avant de réinitialiser son mot de passe.',
    );
  }
  const updated = await updateDatabaseAdminPassword(id, hashAdminPassword(parsePassword(password)));
  if (!updated) throw new AdminUserManageError('not_found', 'Compte introuvable.');
  return {
    id: updated.id,
    username: updated.username,
    displayName: updated.displayName,
    role: updated.role,
    active: updated.active,
  };
}

export async function deactivateManagedAdminUser(actor: AdminUser, id: string): Promise<AdminUser> {
  return updateManagedAdminUser(actor, id, { active: false });
}
