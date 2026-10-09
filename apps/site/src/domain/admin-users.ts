import { z } from 'zod';

export const adminRoleSchema = z.enum(['viewer', 'editor', 'admin']);
export type AdminRole = z.infer<typeof adminRoleSchema>;

export const adminLoginSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]{2,31}$/, 'Identifiant invalide (a-z, 3 à 32 caractères).');
export const adminDisplayNameSchema = z.string().trim().min(1).max(80);

export interface AdminPermissions {
  read: boolean;
  draft: boolean;
  publish: boolean;
}

export function permissionsForRole(role: AdminRole): AdminPermissions {
  switch (role) {
    case 'viewer':
      return { read: true, draft: false, publish: false };
    case 'editor':
      return { read: true, draft: true, publish: false };
    case 'admin':
      return { read: true, draft: true, publish: true };
  }
}

export function roleLabel(role: AdminRole): string {
  switch (role) {
    case 'viewer':
      return 'Lecture';
    case 'editor':
      return 'Édition';
    case 'admin':
      return 'Administration';
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

export const adminUserPublicSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string().min(1),
  role: adminRoleSchema,
  active: z.boolean(),
});

export type AdminUser = z.infer<typeof adminUserPublicSchema>;
