import Dialog from './Dialog.jsx';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? 'Cmd' : 'Ctrl';

const ROWS = [
  [[MOD, 'K'], 'Open the command palette'],
  [['C'], 'Create a task in this project'],
  [['/'], 'Filter tasks (opens the palette outside a project)'],
  [['?'], 'Show this help'],
  [['Esc'], 'Close a dialog, the card panel or the palette'],
  [['Enter'], 'Open the focused card'],
  [['Space'], 'Pick up the focused card, then arrow keys to move it and Space to drop'],
  [[MOD, 'Enter'], 'Post a comment or save a description'],
];

export default function ShortcutHelp({ onClose }) {
  return (
    <Dialog title="Keyboard shortcuts" onClose={onClose}>
      <dl className="shortcuts">
        {ROWS.map(([keys, what]) => (
          <div key={what} className="shortcut-row">
            <dt>
              {keys.map((k, i) => (
                <span key={k}>
                  {i > 0 && ' + '}
                  <kbd className="kbd">{k}</kbd>
                </span>
              ))}
            </dt>
            <dd>{what}</dd>
          </div>
        ))}
      </dl>
      <p className="row-sub">Single key shortcuts are ignored while you are typing in a field.</p>
    </Dialog>
  );
}
