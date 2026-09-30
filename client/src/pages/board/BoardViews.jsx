import { Suspense, lazy, useEffect, useState } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { on } from '../../lib/bus.js';
import { BoardProvider, useBoardCtx } from './BoardContext.jsx';
import BulkBar from './BulkBar.jsx';
import FilterBar from './FilterBar.jsx';
import QuickAdd from './QuickAdd.jsx';
import './views.css';

// The card panel pulls in the markdown renderer, so it loads only when a card is opened.
const CardPanel = lazy(() => import('./card/CardPanel.jsx'));

function Shell() {
  const ctx = useBoardCtx();
  const [params] = useSearchParams();
  const openId = params.get('card');
  const [quick, setQuick] = useState(null);

  // Any screen can ask for the New task dialog (button, "c" shortcut, palette, calendar day).
  useEffect(() => on('quickadd', (opts) => ctx.board && setQuick(opts || {})), [ctx.board]);

  if (ctx.error) {
    return (
      <p className="form-error" role="alert">
        {ctx.error}{' '}
        <button type="button" className="btn-link" onClick={ctx.reload}>
          Try again
        </button>
      </p>
    );
  }

  return (
    <>
      <FilterBar />
      <Outlet />
      <BulkBar />
      {quick && ctx.board && <QuickAdd initial={quick} onClose={() => setQuick(null)} />}
      {openId && ctx.board && (
        <Suspense fallback={<div className="progress" role="status" aria-label="Loading card" />}>
          <CardPanel
            key={openId}
            cardId={openId}
            board={{ labels: ctx.board.labels, columns: ctx.board.columns, setLabels: ctx.setLabels }}
            onCardChange={ctx.mergeCard}
            onClose={ctx.closeCard}
            onArchive={async (card) => {
              if (await ctx.archiveWithUndo(card)) ctx.closeCard();
            }}
          />
        </Suspense>
      )}
    </>
  );
}

export default function BoardViews() {
  return (
    <BoardProvider>
      <Shell />
    </BoardProvider>
  );
}
