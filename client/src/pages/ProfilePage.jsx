import { useRef, useState } from 'react';
import { Camera, LogOut } from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import { useAuth } from '../lib/auth.jsx';
import { errorMessage, fieldErrors } from '../lib/api.js';
import { uploadImage, validateImage } from '../lib/cloudinary.js';
import { toast } from '../lib/toast.js';
import './profile.css';

export default function ProfilePage() {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const fileRef = useRef(null);
  const [name, setName] = useState(user.name);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileFields, setProfileFields] = useState({});
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwFields, setPwFields] = useState({});

  async function saveProfile(patch) {
    setProfileBusy(true);
    setProfileFields({});
    try {
      await updateProfile(patch);
      toast.success('Profile saved');
    } catch (err) {
      toast.error(errorMessage(err));
      setProfileFields(fieldErrors(err));
    } finally {
      setProfileBusy(false);
    }
  }

  async function pickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const problem = validateImage(file);
    if (problem) return toast.error(problem);
    setProfileBusy(true);
    try {
      const url = await uploadImage(file, 'avatar');
      await updateProfile({ avatar: url });
      toast.success('Photo updated');
    } catch (err) {
      toast.error(err.message || errorMessage(err));
    } finally {
      setProfileBusy(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setPwBusy(true);
    setPwFields({});
    try {
      await changePassword(pw);
      setPw({ currentPassword: '', newPassword: '' });
      toast.success('Password changed. Other devices were signed out.');
    } catch (err) {
      toast.error(errorMessage(err));
      setPwFields(fieldErrors(err));
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="profile">
      <div className="page-head">
        <h1>Profile</h1>
        <button
          type="button"
          className="btn"
          onClick={() => {
            logout();
            toast.info('You have been logged out.');
          }}
        >
          <Icon as={LogOut} />
          Log out
        </button>
      </div>

      <section className="panel" aria-labelledby="p-account">
        <h2 id="p-account" className="panel-title">
          Account
        </h2>
        <div className="profile-avatar">
          <Avatar user={user} size={72} />
          <div className="profile-avatar-actions">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pickFile} hidden />
            <button type="button" className="btn" onClick={() => fileRef.current.click()} disabled={profileBusy}>
              <Icon as={Camera} />
              Change photo
            </button>
            {user.avatar && (
              <button type="button" className="btn-link" onClick={() => saveProfile({ avatar: '' })} disabled={profileBusy}>
                Remove photo
              </button>
            )}
          </div>
        </div>

        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            saveProfile({ name });
          }}
        >
          <label className="field">
            <span className="field-label">Name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} aria-invalid={profileFields.name ? 'true' : undefined} />
            {profileFields.name && <span className="field-error">{profileFields.name}</span>}
          </label>
          <dl className="readonly">
            <div>
              <dt>Username</dt>
              <dd className="mono">{user.username}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
          </dl>
          <div>
            <button className="btn btn-primary" disabled={profileBusy || name === user.name}>
              {profileBusy && <span className="spinner" aria-hidden="true" />}
              Save changes
            </button>
          </div>
        </form>
      </section>

      <section className="panel" aria-labelledby="p-password">
        <h2 id="p-password" className="panel-title">
          Password
        </h2>
        <form className="stack" onSubmit={savePassword}>
          <input type="text" name="username" value={user.username} autoComplete="username" readOnly hidden />
          <label className="field">
            <span className="field-label">Current password</span>
            <PasswordInput
              autoComplete="current-password"
              value={pw.currentPassword}
              onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))}
              aria-invalid={pwFields.currentPassword ? 'true' : undefined}
            />
            {pwFields.currentPassword && <span className="field-error">{pwFields.currentPassword}</span>}
          </label>
          <label className="field">
            <span className="field-label">New password</span>
            <PasswordInput
              autoComplete="new-password"
              value={pw.newPassword}
              onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))}
              aria-invalid={pwFields.newPassword ? 'true' : undefined}
            />
            {pwFields.newPassword ? <span className="field-error">{pwFields.newPassword}</span> : <span className="field-hint">At least 8 characters.</span>}
          </label>
          <div>
            <button className="btn btn-primary" disabled={pwBusy || !pw.currentPassword || !pw.newPassword}>
              {pwBusy && <span className="spinner" aria-hidden="true" />}
              Change password
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
