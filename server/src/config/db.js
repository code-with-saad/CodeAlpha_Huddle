import mongoose from 'mongoose';

const EXPECTED_DB = 'huddle_db';

// Mongoose silently uses "test" when the URI has no database name, so refuse to start without one.
export function dbNameFromUri(uri) {
  const match = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/.exec(uri || '');
  return match ? decodeURIComponent(match[1]) : '';
}

// Serverless functions are frozen and reused between requests, so the
// connection promise is cached on globalThis to avoid a new connection per call.
const cache = globalThis.__mongoose || (globalThis.__mongoose = { conn: null, promise: null });

export async function connectDB() {
  if (cache.conn) return cache.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  if (dbNameFromUri(uri) !== EXPECTED_DB) {
    throw new Error(`MONGODB_URI must name the database explicitly (.../${EXPECTED_DB}?...)`);
  }
  cache.promise ??= mongoose.connect(uri, { bufferCommands: false });
  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }
  // Verify the live database, not just the string we passed in.
  const live = cache.conn.connection.name;
  console.log(`MongoDB connected, live database: ${live}`);
  if (live !== EXPECTED_DB) throw new Error(`Connected to "${live}" instead of "${EXPECTED_DB}"`);
  return cache.conn;
}
