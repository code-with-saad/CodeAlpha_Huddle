import Activity from '../models/Activity.js';

// Records one history line. Awaited by callers before they respond, like the realtime publish,
// so it is written even if the serverless function freezes right after the response.
export async function logActivity({ project, actor, type, card = null, data = {} }) {
  try {
    await Activity.create({
      project: project._id || project,
      actor: actor._id || actor,
      type,
      card: card?._id || null,
      cardTitle: card?.title || '',
      data,
    });
  } catch (err) {
    // The history is secondary to the change itself; never fail a request over it.
    console.error('activity log failed:', err.message);
  }
}

export const serializeActivity = (a) => ({
  id: a._id,
  type: a.type,
  actor: a.actor?.toPublic ? a.actor.toPublic() : null,
  card: a.card ? { id: a.card, title: a.cardTitle } : null,
  data: a.data || {},
  createdAt: a.createdAt,
});
