'use client';

import { useState } from 'react';
import Image from 'next/image';
import { z } from 'zod';

const MAX_UPLOAD_BYTES = 8_000_000;

const uploadedPhotoSchema = z.object({
  path: z.string().regex(/^\/api\/host-photos\/[a-f0-9]{64}\.webp$/),
  size: z.number().int().positive(),
});

async function readApiError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'error' in body) {
      if (typeof body.error === 'string') return body.error;
    }
  } catch {
    // Réponse sans JSON : message générique ci-dessous.
  }
  return `La requête a échoué (${response.status.toString()}).`;
}

/** Import d'un portrait d'animateur : le serveur le recadre en carré, la publication l'affiche. */
export function AdminHostPhoto({
  name,
  photo,
  disabled,
  onChange,
}: {
  name: string;
  photo: string | undefined;
  disabled: boolean;
  onChange: (path: string | undefined) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function upload(file: File): Promise<void> {
    setError('');
    setMessage('');
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('La photo doit faire au plus 8 Mo.');
      return;
    }
    setUploading(true);
    try {
      const response = await fetch('/api/admin/host-photo', {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const result = uploadedPhotoSchema.parse(await response.json());
      onChange(result.path);
      setMessage(
        `Photo ${String(result.size)} × ${String(result.size)} prête. Enregistrez le brouillon ou publiez.`,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Import de la photo impossible.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="admin-thumbnail admin-host-photo admin-span-2">
      <div>
        <h3>Photo</h3>
        <p className="admin-help">
          JPEG, PNG ou WebP, au moins 400 × 400 px, 8 Mo maximum. L’image est recadrée en carré au
          centre et ses métadonnées (GPS, appareil) sont retirées.
        </p>
        <label className="admin-field">
          <span>Choisir une photo</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled || uploading}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = '';
              if (file) void upload(file);
            }}
          />
        </label>
        {photo ? (
          <button
            className="btn"
            type="button"
            disabled={disabled || uploading}
            onClick={() => {
              onChange(undefined);
              setMessage('Photo retirée. Enregistrez pour revenir au monogramme.');
            }}
          >
            Retirer la photo
          </button>
        ) : null}
        {uploading ? <p role="status">Import de la photo en cours…</p> : null}
        {message ? <p role="status">{message}</p> : null}
        {error ? (
          <p className="admin-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      {photo ? (
        <Image
          src={photo}
          alt={`Aperçu du portrait de ${name}`}
          width={240}
          height={240}
          sizes="15rem"
          className="admin-thumbnail-preview"
        />
      ) : (
        <p className="admin-thumbnail-empty">Sans photo, la page À propos affiche l’initiale.</p>
      )}
    </div>
  );
}
