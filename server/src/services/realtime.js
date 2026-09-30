import Ably from 'ably';

// MongoDB is the source of truth. After every successful write the API publishes a small event over
// Ably REST so open browsers update. A failed publish is logged and never fails the request.
let rest = null;
function client() {
  if (!process.env.ABLY_API_KEY) return null;
  rest ??= new Ably.Rest({ key: process.env.ABLY_API_KEY });
  return rest;
}

const PUBLISH_TIMEOUT_MS = 4000;

// Awaited by callers: on Vercel the function can freeze as soon as the response is sent,
// so the event has to be out before that.
async function publish(channel, name, data) {
  const c = client();
  if (!c) return;
  let timer;
  try {
    await Promise.race([
      c.channels.get(channel).publish(name, data),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('publish timed out')), PUBLISH_TIMEOUT_MS);
      }),
    ]);
  } catch (err) {
    console.error(`Ably publish failed (${channel} ${name}):`, err.message);
  } finally {
    clearTimeout(timer);
  }
}

// Board and project events. `by` lets the sender's own tab ignore the echo of what it already applied.
export const emitProject = (projectId, name, data, by) => publish(`project:${projectId}`, name, { ...data, by: by ? String(by) : null });

// Personal events: notifications, invitations, access changes.
export const emitUser = (userId, name, data = {}) => publish(`user:${userId}`, name, data);

// Token request for the browser. The API key never leaves the server.
// Every role gets subscribe and presence only; all writes go through the REST API where roles are checked.
export async function createToken(userId, projectIds) {
  const c = client();
  if (!c) throw Object.assign(new Error('Realtime is not configured'), { status: 503 });
  const capability = { [`user:${userId}`]: ['subscribe', 'history'] };
  for (const id of projectIds.slice(0, 100)) capability[`project:${id}`] = ['subscribe', 'presence', 'history'];
  return c.auth.createTokenRequest({ clientId: String(userId), capability, ttl: 60 * 60 * 1000 });
}
