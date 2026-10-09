'use client';

import { useState, type FormEvent } from 'react';
import { z } from 'zod';

const okResponseSchema = z.object({ ok: z.literal(true) });

interface Props {
  pending: boolean;
  onBusyChange: (busy: boolean) => void;
  onMessage: (message: string) => void;
}

export function AdminPasswordForm({ pending, onBusyChange, onMessage }: Props) {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [localError, setLocalError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');

  function resetFields(): void {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLocalError('');
    setLocalSuccess('');
    onMessage('');
    if (newPassword !== confirmPassword) {
      setLocalError('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }
    onBusyChange(true);
    try {
      const response = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const value: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof value === 'object' &&
          value !== null &&
          'error' in value &&
          typeof value.error === 'string'
            ? value.error
            : `La requête a échoué (${String(response.status)}).`;
        throw new Error(message);
      }
      okResponseSchema.parse(value);
      resetFields();
      setLocalSuccess('Mot de passe mis à jour.');
      onMessage('Mot de passe mis à jour.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Changement impossible.';
      setLocalError(message);
      onMessage(message);
    } finally {
      onBusyChange(false);
    }
  }

  return (
    <section className="admin-password-panel" aria-labelledby="admin-password-title">
      <div className="admin-section-heading">
        <div>
          <span className="eyebrow">Compte</span>
          <h2 id="admin-password-title">Mot de passe</h2>
        </div>
        <button
          className="btn"
          type="button"
          aria-expanded={open}
          onClick={() => {
            setOpen((current) => !current);
            setLocalError('');
            setLocalSuccess('');
          }}
        >
          {open ? 'Fermer' : 'Changer le mot de passe'}
        </button>
      </div>
      {open ? (
        <form className="admin-form admin-password-form" onSubmit={(event) => void submit(event)}>
          <p className="admin-help">
            Au moins 12 caractères. Après l’enregistrement, votre session reste active avec le
            nouveau mot de passe.
          </p>
          <label className="admin-field">
            <span>Mot de passe actuel</span>
            <input
              autoComplete="current-password"
              type={showPasswords ? 'text' : 'password'}
              disabled={pending}
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value);
              }}
              required
            />
          </label>
          <label className="admin-field">
            <span>Nouveau mot de passe</span>
            <input
              autoComplete="new-password"
              type={showPasswords ? 'text' : 'password'}
              disabled={pending}
              minLength={12}
              maxLength={200}
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
              }}
              required
            />
          </label>
          <label className="admin-field">
            <span>Confirmation</span>
            <input
              autoComplete="new-password"
              type={showPasswords ? 'text' : 'password'}
              disabled={pending}
              minLength={12}
              maxLength={200}
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
              }}
              required
            />
          </label>
          <div className="admin-save-row">
            <button
              type="button"
              className="btn"
              aria-pressed={showPasswords}
              onClick={() => {
                setShowPasswords((current) => !current);
              }}
            >
              {showPasswords ? 'Masquer' : 'Afficher'}
            </button>
            <button className="btn btn-solid" type="submit" disabled={pending}>
              {pending ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
            </button>
          </div>
          {localError ? (
            <p className="admin-login-error" role="alert">
              {localError}
            </p>
          ) : null}
          {localSuccess ? (
            <p className="admin-help" role="status">
              {localSuccess}
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}
