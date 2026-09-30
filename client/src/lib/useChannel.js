import { useEffect, useRef } from 'react';
import { subscribeChannel } from './realtime.js';
import { TAB_ID } from './api.js';

// Subscribes a component to a channel for as long as it is mounted. Handlers are kept in a ref, so
// changing them does not resubscribe. Events this tab caused itself are skipped: it already shows them.
export default function useChannel(name, onEvent, onResync) {
  const ev = useRef(onEvent);
  const rs = useRef(onResync);
  ev.current = onEvent;
  rs.current = onResync;

  useEffect(() => {
    if (!name) return;
    return subscribeChannel(
      name,
      (eventName, data) => {
        if (data?.tab && data.tab === TAB_ID) return;
        ev.current?.(eventName, data);
      },
      () => rs.current?.()
    );
  }, [name]);
}
