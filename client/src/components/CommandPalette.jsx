import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, FolderKanban, Moon, Plus, Search, UserRound, Keyboard } from 'lucide-react';
import Icon from './Icon.jsx';
import { api } from '../lib/api.js';
import { emit } from '../lib/bus.js';
import { atLeast } from '../lib/roles.js';

const norm = (s) => s.toLowerCase();

// Ctrl or Cmd + K. Jump to a project, create a task, search tasks across every project, or run a command.
export default function CommandPalette({ onClose, onHelp }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dialog = useRef(null);
  const list = useRef(null);
  const [q, setQ] = useState('');
  const [projects, setProjects] = useState([]);
  const [found, setFound] = useState({ cards: [], projects: [] });
  const [active, setActive] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
    return () => el?.close();
  }, []);

  useEffect(() => {
    api.get('/projects').then(({ data }) => setProjects(data.projects)).catch(() => {});
  }, []);

  // Server search across every project, after a short pause and only for two characters or more.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setFound({ cards: [], projects: [] });
      return;
    }
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/search', { params: { q: term } });
        if (mine === seq.current) setFound(data);
      } catch {
        if (mine === seq.current) setFound({ cards: [], projects: [] });
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const currentId = location.pathname.match(/^\/p\/([^/]+)/)?.[1];
  const current = projects.find((p) => p.id === currentId);

  const items = useMemo(() => {
    const go = (to, state) => () => { onClose(); navigate(to, { state }); };
    const editable = (p) => atLeast(p.myRole, 'member');
    const commands = [];
    if (current && editable(current)) commands.push({ id: 'new', icon: Plus, label: `Create task in ${current.name}`, hint: 'C', run: go(`/p/${current.id}`, { quickAdd: true }) });
    else projects.filter(editable).slice(0, 4).forEach((p) => commands.push({ id: `new-${p.id}`, icon: Plus, label: `Create task in ${p.name}`, run: go(`/p/${p.id}`, { quickAdd: true }) }));
    commands.push(
      { id: 'projects', icon: FolderKanban, label: 'Go to projects', run: go('/projects') },
      { id: 'notes', icon: Bell, label: 'Go to notifications', run: go('/notifications') },
      { id: 'profile', icon: UserRound, label: 'Go to profile', run: go('/profile') },
      { id: 'theme', icon: Moon, label: 'Change theme', run: () => { onClose(); emit('toggle-theme'); } },
      { id: 'help', icon: Keyboard, label: 'Keyboard shortcuts', hint: '?', run: () => { onClose(); onHelp(); } }
    );
    const term = norm(q.trim());
    const match = (s) => !term || norm(s).includes(term);
    const projectItems = projects.filter((p) => match(p.name)).map((p) => ({ id: `p-${p.id}`, icon: FolderKanban, label: p.name, sub: 'Project', run: go(`/p/${p.id}`) }));
    const taskItems = found.cards.map((c) => ({ id: `c-${c.id}`, icon: Search, label: c.title, sub: `${c.project.name}${c.column ? ` / ${c.column}` : ''}${c.snippet ? `: ${c.snippet}` : ''}`, run: go(`/p/${c.project.id}?card=${c.id}`) }));
    return [
      { group: 'Commands', rows: commands.filter((c) => match(c.label)) },
      { group: 'Projects', rows: projectItems },
      { group: 'Tasks', rows: taskItems },
    ].filter((g) => g.rows.length);
  }, [q, projects, found, current, navigate, onClose, onHelp]);

  const flat = items.flatMap((g) => g.rows);
  useEffect(() => setActive(0), [q, flat.length]);
  useEffect(() => {
    list.current?.querySelector('[aria-selected=true]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (flat.length ? (a + 1) % flat.length : 0)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (flat.length ? (a - 1 + flat.length) % flat.length : 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); flat[active]?.run(); }
  }

  let index = -1;
  return (
    <dialog
      ref={dialog}
      className="palette"
      aria-label="Command palette"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => e.target === dialog.current && onClose()}
    >
      <div className="palette-input">
        <Icon as={Search} size={16} />
        <input
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={flat[active] ? `pal-${flat[active].id}` : undefined}
          aria-label="Search projects, tasks and commands"
          placeholder="Search tasks and projects, or type a command"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          autoFocus
        />
        <kbd className="kbd">Esc</kbd>
      </div>
      <div id="palette-list" ref={list} role="listbox" className="palette-list">
        {flat.length === 0 && <p className="row-sub palette-empty">{q.trim().length < 2 ? 'Nothing matches.' : 'No results.'}</p>}
        {items.map((g) => (
          <div key={g.group} role="group" aria-label={g.group}>
            <div className="palette-group">{g.group}</div>
            {g.rows.map((r) => {
              index += 1;
              const i = index;
              return (
                <div key={r.id} id={`pal-${r.id}`} role="option" aria-selected={i === active} className={`palette-row${i === active ? ' palette-active' : ''}`} onMouseMove={() => setActive(i)} onClick={r.run}>
                  <Icon as={r.icon} size={16} />
                  <span className="palette-label">{r.label}</span>
                  {r.sub && <span className="row-sub palette-sub">{r.sub}</span>}
                  {r.hint && <kbd className="kbd">{r.hint}</kbd>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </dialog>
  );
}
