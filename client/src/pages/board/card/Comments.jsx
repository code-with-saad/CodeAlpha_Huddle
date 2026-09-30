import { useMemo, useRef, useState } from 'react';
import Avatar from '../../../components/Avatar.jsx';
import Markdown from '../../../components/Markdown.jsx';
import { timeAgo } from '../../../lib/date.js';

// The @word being typed at the caret, if any.
function mentionAt(text, caret) {
  const m = /(?:^|[^a-z0-9_])@([a-z0-9_]{0,20})$/i.exec(text.slice(0, caret));
  return m ? { query: m[1].toLowerCase(), start: caret - m[1].length - 1 } : null;
}

function Composer({ members, onSubmit, initial = '', submitLabel = 'Comment', onCancel, autoFocus = false }) {
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [caret, setCaret] = useState(0);
  const [pick, setPick] = useState(0);
  const area = useRef(null);

  const mention = mentionAt(text, caret);
  const options = useMemo(() => {
    if (!mention) return [];
    return members.filter((m) => m.user.username.startsWith(mention.query) || m.user.name.toLowerCase().startsWith(mention.query)).slice(0, 5);
  }, [mention?.query, members]); // eslint-disable-line react-hooks/exhaustive-deps

  function insert(m) {
    const before = text.slice(0, mention.start);
    const after = text.slice(caret);
    const next = `${before}@${m.user.username} ${after}`;
    setText(next);
    const pos = before.length + m.user.username.length + 2;
    requestAnimationFrame(() => {
      area.current?.focus();
      area.current?.setSelectionRange(pos, pos);
      setCaret(pos);
    });
  }

  async function submit(e) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    // Clear at once so the next comment can be typed; the text returns if posting fails.
    setText('');
    const ok = await onSubmit(body);
    if (!ok) setText(body);
    else onCancel?.();
    setBusy(false);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) return submit(e);
    if (options.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setPick((p) => (p + 1) % options.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setPick((p) => (p - 1 + options.length) % options.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insert(options[pick] || options[0]); return; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setCaret(0); return; }
    }
  }

  return (
    <form className="composer" onSubmit={submit}>
      <div className="composer-box">
        <textarea
          ref={area}
          className="input"
          rows={3}
          maxLength={2000}
          value={text}
          autoFocus={autoFocus}
          placeholder="Write a comment. Use @ to mention a teammate."
          aria-label="Comment"
          onChange={(e) => { setText(e.target.value); setCaret(e.target.selectionStart); setPick(0); }}
          onKeyUp={(e) => setCaret(e.target.selectionStart)}
          onClick={(e) => setCaret(e.target.selectionStart)}
          onKeyDown={onKeyDown}
        />
        {options.length > 0 && (
          <ul className="results mention-list" role="listbox" aria-label="Mention a teammate">
            {options.map((m, i) => (
              <li key={m.user.id} role="option" aria-selected={i === pick}>
                <button type="button" className="result" aria-selected={i === pick} onMouseDown={(e) => { e.preventDefault(); insert(m); }}>
                  <Avatar user={m.user} size={20} />
                  <span>{m.user.name}</span>
                  <span className="row-sub mono">@{m.user.username}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="row-actions" style={{ justifyContent: 'flex-start' }}>
        <button className="btn btn-primary btn-sm" disabled={!text.trim()}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-sm btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <span className="row-sub">Ctrl+Enter to send</span>
      </div>
    </form>
  );
}

export default function Comments({ comments, people, members, usernames, me, canComment, isAdmin, onPost, onEdit, onRemove }) {
  const [editing, setEditing] = useState(null);
  const who = (id) => people.find((p) => p.id === id) || members.find((m) => m.user.id === id)?.user || { id, name: 'Former member', username: '', avatar: '' };

  return (
    <section className="sheet-section" aria-labelledby="cm-title">
      <div className="section-head">
        <h3 id="cm-title">Comments</h3>
        <span className="mono row-sub">{comments.length}</span>
      </div>
      {canComment && <Composer members={members} onSubmit={(body) => onPost(body)} />}
      {comments.length === 0 && <p className="row-sub">No comments yet.</p>}
      <ul className="comment-list">
        {[...comments].reverse().map((c) => {
          const a = who(c.author);
          const mine = c.author === me.id;
          return (
            <li key={c.id} className={`comment${c.pending ? ' comment-pending' : ''}`}>
              <Avatar user={a} size={28} />
              <div className="comment-main">
                <div className="comment-head">
                  <strong>{a.name}</strong>
                  <span className="row-sub">{c.pending ? 'Sending' : timeAgo(c.createdAt)}{c.editedAt ? ', edited' : ''}</span>
                </div>
                {editing === c.id ? (
                  <Composer members={members} initial={c.body} submitLabel="Save" autoFocus onSubmit={(body) => onEdit(c, body)} onCancel={() => setEditing(null)} />
                ) : (
                  <Markdown text={c.body} usernames={usernames} />
                )}
                {!c.pending && editing !== c.id && (mine || isAdmin) && canComment && (
                  <div className="comment-actions">
                    {mine && (
                      <button type="button" className="btn-link" onClick={() => setEditing(c.id)}>
                        Edit
                      </button>
                    )}
                    <button type="button" className="btn-link" onClick={() => onRemove(c)}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
