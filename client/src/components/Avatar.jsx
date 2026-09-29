import { thumb } from '../lib/cloudinary.js';

// Photo when there is one, otherwise the first letter of the name on a tinted tile.
export default function Avatar({ user, size = 32 }) {
  const label = user?.name || user?.username || '?';
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
  return user?.avatar ? (
    <img className="avatar" src={thumb(user.avatar, size)} alt="" width={size} height={size} style={style} />
  ) : (
    <span className="avatar avatar-initial" style={style} aria-hidden="true">
      {label.charAt(0).toUpperCase()}
    </span>
  );
}
