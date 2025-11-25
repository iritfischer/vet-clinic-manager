import { supabase } from '@/integrations/supabase/client';

type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'VIEW'
  | 'EXPORT'
  | 'SETTINGS_CHANGE'
  | 'MFA_ENABLED'
  | 'MFA_DISABLED'
  | 'PASSWORD_RESET'
  | 'PASSWORD_CHANGED';

interface AuditLogParams {
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event to the database
 * @param params - The audit event parameters
 */
export const logAuditEvent = async (params: AuditLogParams): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get clinic_id from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('clinic_id')
      .eq('id', user.id)
      .single();

    if (!profile?.clinic_id) return;

    // Insert audit log (table created via migration, type assertion needed until types regenerated)
    await (supabase.from('audit_logs' as never) as ReturnType<typeof supabase.from>).insert({
      clinic_id: profile.clinic_id,
      user_id: user.id,
      action: params.action,
      entity_type: params.entityType || 'system',
      entity_id: params.entityId || null,
      new_data: params.metadata || null,
    } as never);
  } catch (error) {
    // Silently fail - audit logging should not break the app
    console.error('Failed to log audit event:', error);
  }
};

/**
 * Log a login event
 */
export const logLogin = () => logAuditEvent({ action: 'LOGIN' });

/**
 * Log a logout event
 */
export const logLogout = () => logAuditEvent({ action: 'LOGOUT' });

/**
 * Log when user views sensitive data
 */
export const logView = (entityType: string, entityId: string) =>
  logAuditEvent({ action: 'VIEW', entityType, entityId });

/**
 * Log data export
 */
export const logExport = (entityType: string, metadata?: Record<string, unknown>) =>
  logAuditEvent({ action: 'EXPORT', entityType, metadata });

/**
 * Log settings change
 */
export const logSettingsChange = (settingType: string, metadata?: Record<string, unknown>) =>
  logAuditEvent({ action: 'SETTINGS_CHANGE', entityType: settingType, metadata });

/**
 * Log MFA enabled
 */
export const logMFAEnabled = () => logAuditEvent({ action: 'MFA_ENABLED' });

/**
 * Log MFA disabled
 */
export const logMFADisabled = () => logAuditEvent({ action: 'MFA_DISABLED' });

/**
 * Log password reset request
 */
export const logPasswordResetRequest = () => logAuditEvent({ action: 'PASSWORD_RESET' });

/**
 * Log password changed
 */
export const logPasswordChanged = () => logAuditEvent({ action: 'PASSWORD_CHANGED' });
