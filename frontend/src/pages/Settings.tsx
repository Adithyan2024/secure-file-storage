import { FormEvent, useEffect, useState } from 'react';
import { changePasswordRequest, updateSettingsRequest } from '../api/auth';
import { getStorageRequest, StorageStats } from '../api/files';
import { extractErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatBytes } from '../utils/format';
import { PasswordInput } from '../components/PasswordInput';

export function Settings() {
  const { user, refreshUser, setSessionToken } = useAuth();
  const { showToast } = useToast();

  const [storage, setStorage] = useState<StorageStats | null>(null);
  const [defaultVisibility, setDefaultVisibility] = useState<'private' | 'public'>(
    user?.defaultVisibility || 'private'
  );

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    getStorageRequest()
      .then(setStorage)
      .catch((err) => showToast(extractErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) setDefaultVisibility(user.defaultVisibility);
  }, [user]);

  async function handleVisibilityChange(value: 'private' | 'public') {
    setDefaultVisibility(value);
    try {
      await updateSettingsRequest(value);
      await refreshUser();
      showToast('Default visibility updated');
    } catch (err) {
      showToast(extractErrorMessage(err));
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    setIsChangingPassword(true);
    try {
      const token = await changePasswordRequest(currentPassword, newPassword);
      setSessionToken(token);
      setCurrentPassword('');
      setNewPassword('');
      setPasswordSuccess(true);
      showToast('Password updated');
    } catch (err) {
      setPasswordError(extractErrorMessage(err));
    } finally {
      setIsChangingPassword(false);
    }
  }

  const usedPercent = storage ? Math.min(100, (storage.usedBytes / storage.quotaBytes) * 100) : 0;
  const isGoogleAccount = user?.authProvider === 'google';

  return (
    <div>
      <div className="content-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your account and storage preferences.</p>
        </div>
      </div>

      <div className="settings-page">
        <div className="settings-section">
          <h3>Storage</h3>
          <p className="settings-desc">
            {storage ? `${storage.fileCount} file${storage.fileCount === 1 ? '' : 's'}` : 'Loading…'}
          </p>
          <div className="storage-bar-track">
            <div className="storage-bar-fill" style={{ width: `${usedPercent}%` }} />
          </div>
          {storage && (
            <div className="storage-bar-label">
              {formatBytes(storage.usedBytes)} of {formatBytes(storage.quotaBytes)} used
            </div>
          )}
        </div>

        <div className="settings-section">
          <h3>Default visibility for new uploads</h3>
          <p className="settings-desc">
            Choose whether files you upload are private or public by default. You can always change it
            per-file afterward.
          </p>
          <div className="segmented">
            <button
              className={defaultVisibility === 'private' ? 'active' : ''}
              onClick={() => handleVisibilityChange('private')}
            >
              Private
            </button>
            <button
              className={defaultVisibility === 'public' ? 'active' : ''}
              onClick={() => handleVisibilityChange('public')}
            >
              Public
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3>Change password</h3>
          {isGoogleAccount ? (
            <p className="settings-desc">
              This account signs in with Google, so there's no password to change here.
            </p>
          ) : (
            <>
              <p className="settings-desc">Changing your password signs you out of any other active sessions.</p>
              <form onSubmit={handlePasswordSubmit}>
                {passwordError && <div className="form-error">{passwordError}</div>}
                {passwordSuccess && (
                  <div style={{ color: 'var(--locked)', fontSize: 13, marginBottom: 16 }}>
                    Password updated successfully.
                  </div>
                )}
                <div className="field">
                  <label htmlFor="currentPassword">Current password</label>
                  <PasswordInput
                    id="currentPassword"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="newPassword">New password</label>
                  <PasswordInput
                    id="newPassword"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <div className="field-hint">At least 8 characters, including a number.</div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={isChangingPassword}>
                  {isChangingPassword ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
