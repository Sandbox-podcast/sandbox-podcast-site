'use client';

import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import { z } from 'zod';
import { adminRoleSchema, roleLabel, type AdminRole } from '@/domain/admin-users';

const managedUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  role: adminRoleSchema,
  active: z.boolean(),
});
const listSchema = z.object({ users: z.array(managedUserSchema) });
const oneSchema = z.object({ user: managedUserSchema });

type ManagedUser = z.infer<typeof managedUserSchema>;

interface Props {
  currentUsername: string;
  pending: boolean;
  onBusyChange: (busy: boolean) => void;
  onMessage: (message: string) => void;
}

const roles: AdminRole[] = ['viewer', 'editor', 'admin'];

async function readError(response: Response): Promise<string> {
  const value: unknown = await response.json().catch(() => null);
  if (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof value.error === 'string'
  ) {
    return value.error;
  }
  return `La requête a échoué (${String(response.status)}).`;
}

export function AdminUsersPanel({ currentUsername, pending, onBusyChange, onMessage }: Props) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<AdminRole>('editor');
  const [password, setPassword] = useState('');
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [localError, setLocalError] = useState('');

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLocalError('');
    try {
      const response = await fetch('/api/admin/users', { cache: 'no-store' });
      if (!response.ok) throw new Error(await readError(response));
      const parsed = listSchema.parse(await response.json());
      setUsers(parsed.users);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Chargement impossible.';
      setLocalError(message);
      onMessage(message);
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createUser(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLocalError('');
    onBusyChange(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ username, displayName, role, password }),
      });
      if (!response.ok) throw new Error(await readError(response));
      oneSchema.parse(await response.json());
      setUsername('');
      setDisplayName('');
      setRole('editor');
      setPassword('');
      onMessage('Compte créé.');
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Création impossible.';
      setLocalError(message);
      onMessage(message);
    } finally {
      onBusyChange(false);
    }
  }

  async function patchUser(
    id: string,
    body: { displayName?: string; role?: AdminRole; active?: boolean; password?: string },
    successMessage: string,
  ): Promise<void> {
    setLocalError('');
    onBusyChange(true);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await readError(response));
      oneSchema.parse(await response.json());
      onMessage(successMessage);
      if (body.password !== undefined) {
        setResetPasswords((current) =>
          Object.fromEntries(Object.entries(current).filter(([key]) => key !== id)),
        );
      }
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Mise à jour impossible.';
      setLocalError(message);
      onMessage(message);
    } finally {
      onBusyChange(false);
    }
  }

  async function deactivateUser(id: string, label: string): Promise<void> {
    if (!window.confirm(`Désactiver le compte « ${label} » ? Il ne pourra plus se connecter.`)) {
      return;
    }
    setLocalError('');
    onBusyChange(true);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(await readError(response));
      oneSchema.parse(await response.json());
      onMessage('Compte désactivé.');
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Désactivation impossible.';
      setLocalError(message);
      onMessage(message);
    } finally {
      onBusyChange(false);
    }
  }

  return (
    <section className="admin-users-panel" aria-labelledby="admin-users-title">
      <div className="admin-section-heading">
        <div>
          <span className="eyebrow">Comptes</span>
          <h2 id="admin-users-title">Utilisateurs</h2>
        </div>
        <button
          className="btn"
          type="button"
          disabled={pending || loading}
          onClick={() => void refresh()}
        >
          Actualiser
        </button>
      </div>
      <p className="admin-help">
        Réservé aux administrateurs. Désactiver un compte invalide sa session ; le dernier
        administrateur actif ne peut pas être retiré.
      </p>

      <form className="admin-form admin-users-create" onSubmit={(event) => void createUser(event)}>
        <h3>Ajouter un compte</h3>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Identifiant</span>
            <input
              autoComplete="off"
              spellCheck={false}
              disabled={pending}
              pattern="[a-z][a-z0-9-]{2,31}"
              title="Minuscules, 3 à 32 caractères"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value.trim().toLowerCase());
              }}
              required
            />
          </label>
          <label className="admin-field">
            <span>Nom affiché</span>
            <input
              disabled={pending}
              maxLength={80}
              value={displayName}
              onChange={(event) => {
                setDisplayName(event.target.value);
              }}
              required
            />
          </label>
          <label className="admin-field">
            <span>Rôle</span>
            <select
              disabled={pending}
              value={role}
              onChange={(event) => {
                setRole(adminRoleSchema.parse(event.target.value));
              }}
            >
              {roles.map((value) => (
                <option key={value} value={value}>
                  {roleLabel(value)}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Mot de passe initial</span>
            <input
              autoComplete="new-password"
              type="password"
              disabled={pending}
              minLength={12}
              maxLength={200}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
              required
            />
          </label>
        </div>
        <div className="admin-save-row">
          <button className="btn btn-solid" type="submit" disabled={pending}>
            {pending ? 'Création…' : 'Créer le compte'}
          </button>
        </div>
      </form>

      {loading ? <p className="admin-help">Chargement des comptes…</p> : null}
      {!loading && users.length === 0 ? <p className="admin-help">Aucun compte.</p> : null}

      <ul className="admin-users-list">
        {users.map((user) => {
          const isSelf = user.username === currentUsername;
          return (
            <li key={user.id} className={`admin-user-row${user.active ? '' : ' is-inactive'}`}>
              <div className="admin-user-identity">
                <strong>{user.displayName}</strong>
                <span>
                  {user.username}
                  {isSelf ? ' · vous' : ''}
                  {user.active ? '' : ' · désactivé'}
                </span>
              </div>
              <label className="admin-field admin-user-role">
                <span className="sr-only">Rôle de {user.displayName}</span>
                <select
                  disabled={pending || isSelf}
                  value={user.role}
                  onChange={(event) => {
                    void patchUser(
                      user.id,
                      { role: adminRoleSchema.parse(event.target.value) },
                      'Rôle mis à jour.',
                    );
                  }}
                >
                  {roles.map((value) => (
                    <option key={value} value={value}>
                      {roleLabel(value)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field admin-user-name">
                <span className="sr-only">Nom affiché de {user.username}</span>
                <input
                  disabled={pending}
                  defaultValue={user.displayName}
                  maxLength={80}
                  key={`${user.id}-${user.displayName}`}
                  onBlur={(event) => {
                    const next = event.target.value.trim();
                    if (!next || next === user.displayName) return;
                    void patchUser(user.id, { displayName: next }, 'Nom mis à jour.');
                  }}
                />
              </label>
              <div className="admin-user-reset">
                <label className="admin-field">
                  <span className="sr-only">Nouveau mot de passe pour {user.username}</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    disabled={pending || !user.active}
                    minLength={12}
                    maxLength={200}
                    placeholder="Nouveau mot de passe"
                    value={resetPasswords[user.id] ?? ''}
                    onChange={(event) => {
                      const value = event.target.value;
                      setResetPasswords((current) => ({ ...current, [user.id]: value }));
                    }}
                  />
                </label>
                <button
                  className="btn"
                  type="button"
                  disabled={pending || !user.active || !resetPasswords[user.id]?.length}
                  onClick={() => {
                    const next = resetPasswords[user.id] ?? '';
                    if (next.length < 12) return;
                    void patchUser(user.id, { password: next }, 'Mot de passe réinitialisé.');
                  }}
                >
                  Réinit. MDP
                </button>
              </div>
              <div className="admin-user-actions">
                {user.active ? (
                  <button
                    className="btn"
                    type="button"
                    disabled={pending || isSelf}
                    onClick={() => {
                      void deactivateUser(user.id, user.username);
                    }}
                  >
                    Désactiver
                  </button>
                ) : (
                  <button
                    className="btn btn-solid"
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      void patchUser(user.id, { active: true }, 'Compte réactivé.');
                    }}
                  >
                    Réactiver
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {localError ? (
        <p className="admin-login-error" role="alert">
          {localError}
        </p>
      ) : null}
    </section>
  );
}
