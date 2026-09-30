import { api } from './api.js';

// One Ably connection per browser tab. The library loads on demand, after the app is on screen.
// The tab never sees the API key: it asks the server for a token request limited to the channels
// its user may read (see GET /api/realtime/token).
let clientPromise = null;
let client = null;

// name -> { channel, count, listener, handlers:Set, resync:Set, presence }
const channels = new Map();

async function create() {
  const { Realtime } = await import('ably');
  const c = new Realtime({
    authCallback: (_params, cb) =>
      api
        .get('/realtime/token')
        .then((r) => cb(null, r.data))
        .catch((err) => cb(err)),
  });
  client = c;
  // Development only: lets tests drop and restore the connection to exercise the resync path.
  if (import.meta.env.DEV) window.__huddleRealtime = c;
  return c;
}

export function startRealtime() {
  clientPromise ??= create().catch((err) => {
    clientPromise = null;
    throw err;
  });
  return clientPromise;
}

export function stopRealtime() {
  channels.clear();
  const c = client;
  client = null;
  clientPromise = null;
  c?.close();
}

// Ask for a fresh token, for example after a role change or after joining or leaving a project.
// Channels the person may no longer read are detached by Ably itself.
export async function refreshAccess() {
  const c = await startRealtime().catch(() => null);
  if (c) await c.auth.authorize().catch(() => {});
}

function entry(name) {
  let e = channels.get(name);
  if (!e) {
    e = { channel: null, count: 0, handlers: new Set(), resync: new Set(), ready: null };
    channels.set(name, e);
  }
  return e;
}

// Subscribes to a channel. Channels are shared and reference counted: the first listener attaches,
// and when the last one leaves the channel is detached and released, which frees a slot on the
// free plan's connection and channel limits.
// `onResync` runs whenever the channel (re)attaches without having resumed, meaning events may have
// been missed (first attach, or after an outage): refetch from the API instead of trusting the stream.
export function subscribeChannel(name, handler, onResync) {
  const e = entry(name);
  e.count += 1;
  e.handlers.add(handler);
  if (onResync) e.resync.add(onResync);

  if (!e.ready) {
    e.ready = startRealtime()
      .then((c) => {
        if (e.count === 0) return;
        const channel = c.channels.get(name);
        e.channel = channel;
        e.listener = (m) => e.handlers.forEach((h) => h(m.name, m.data));
        e.onState = (change) => {
          if (change.current === 'attached' && !change.resumed) e.resync.forEach((f) => f());
        };
        channel.subscribe(e.listener);
        channel.on('attached', e.onState);
        // A channel that attached before this listener existed still needs one refetch.
        if (channel.state === 'attached') e.resync.forEach((f) => f());
      })
      .catch(() => {
        /* realtime is unavailable; the app keeps working through the API */
      });
  }

  return () => {
    e.handlers.delete(handler);
    if (onResync) e.resync.delete(onResync);
    e.count -= 1;
    if (e.count > 0) return;
    channels.delete(name);
    const { channel, listener, onState } = e;
    if (channel) {
      channel.unsubscribe(listener);
      channel.off('attached', onState);
      channel.detach().catch(() => {});
      client?.channels.release(name);
    }
  };
}

// Who is looking at a project board right now. Returns a stop function.
export function joinPresence(name, data, onChange) {
  let stopped = false;
  let channel = null;
  const emit = async () => {
    if (!channel || stopped) return;
    const members = await channel.presence.get().catch(() => []);
    if (stopped) return;
    // One entry per person even if they have several tabs open.
    const seen = new Map();
    for (const m of members) if (!seen.has(m.clientId)) seen.set(m.clientId, { id: m.clientId, ...m.data });
    onChange([...seen.values()]);
  };

  startRealtime()
    .then(async (c) => {
      if (stopped) return;
      channel = c.channels.get(name);
      channel.presence.subscribe(emit);
      await channel.presence.enter(data).catch(() => {});
      emit();
    })
    .catch(() => {});

  return () => {
    stopped = true;
    if (!channel) return;
    channel.presence.unsubscribe();
    channel.presence.leave().catch(() => {});
  };
}
