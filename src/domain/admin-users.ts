import { z } from 'zod';

/** Droits du backoffice : lecture, brouillon, publication. */
export const adminRoleSchema = z.enum(['viewer', 'editor', 'admin']);
export type AdminRole = z.infer<typeof adminRoleSchema>;

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
    default:
      throw new Error('Rôle admin inconnu.');
  }
}

export const adminUserPublicSchema = z.object({
  id: z.uuid(),
  login: z.string().min(1),
  displayName: z.string().min(1),
  role: adminRoleSchema,
  active: z.boolean(),
});

export type AdminUser = z.infer<typeof adminUserPublicSchema>;
