import { useRef, useState } from 'react';
import { File, Paperclip, Trash2 } from 'lucide-react';
import Icon from '../../../components/Icon.jsx';
import { FILE_ACCEPT, FILE_TYPES, uploadFile, validateFile } from '../../../lib/cloudinary.js';
import { fileSize } from '../../../lib/date.js';
import { toast } from '../../../lib/toast.js';

const isImage = (mime) => mime.startsWith('image/');
// Small square preview for images; Cloudinary resizes on delivery.
const preview = (url) => url.replace('/upload/', '/upload/c_fill,w_112,h_112,f_auto,q_auto/');

export default function Attachments({ card, me, canEdit, isAdmin, onAdd, onRemove }) {
  const input = useRef(null);
  const [progress, setProgress] = useState(null); // 0..1 while uploading

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const problem = validateFile(file);
    if (problem) return toast.error(problem);
    setProgress(0);
    try {
      const uploaded = await uploadFile(file, setProgress);
      await onAdd(uploaded);
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setProgress(null);
    }
  }

  return (
    <section className="sheet-section" aria-labelledby="at-title">
      <div className="section-head">
        <h3 id="at-title">Attachments</h3>
        {canEdit && (
          <>
            <input ref={input} type="file" accept={FILE_ACCEPT} onChange={pick} hidden />
            <button type="button" className="btn btn-sm" onClick={() => input.current.click()} disabled={progress !== null}>
              <Icon as={Paperclip} size={14} />
              Add file
            </button>
          </>
        )}
      </div>
      {progress !== null && (
        <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Upload progress">
          <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      {card.attachments.length === 0 && progress === null && <p className="row-sub">No files attached.{canEdit ? ' Images, PDF, text and Office files up to 10 MB.' : ''}</p>}
      <ul className="attach-list">
        {card.attachments.map((a) => (
          <li key={a.id} className="attach-row">
            <a href={a.url} target="_blank" rel="noopener noreferrer" className="attach-link">
              {isImage(a.mime) ? <img src={preview(a.url)} alt="" width={40} height={40} className="attach-thumb" /> : <span className="attach-icon"><Icon as={File} size={18} /></span>}
              <span className="attach-text">
                <span className="attach-name">{a.name}</span>
                <span className="row-sub mono">
                  {FILE_TYPES[a.mime] || 'File'}, {fileSize(a.size)}
                </span>
              </span>
            </a>
            {canEdit && (a.uploadedBy === me.id || isAdmin) && (
              <button type="button" className="icon-btn" aria-label={`Remove ${a.name}`} onClick={() => onRemove(a)}>
                <Icon as={Trash2} size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
