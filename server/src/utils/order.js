// Fractional ordering. Items carry a numeric position; inserting between two neighbours takes
// their midpoint, so a move writes one document. When two neighbours get too close the whole
// list is renumbered.
export const STEP = 1024;
const MIN_GAP = 1e-6;

export function positionFor(others, index) {
  const i = Math.max(0, Math.min(index, others.length));
  const prev = others[i - 1]?.position;
  const next = others[i]?.position;
  if (prev === undefined && next === undefined) return STEP;
  if (prev === undefined) return next - STEP;
  if (next === undefined) return prev + STEP;
  return (prev + next) / 2;
}

// Position for `movedId` when placed at `index` among the other active items matching `filter`.
export async function placeAt(Model, filter, movedId, index) {
  const load = () => Model.find({ ...filter, _id: { $ne: movedId } }).sort({ position: 1 }).select('position');
  let others = await load();
  const i = Math.max(0, Math.min(index, others.length));
  if (i > 0 && i < others.length && others[i].position - others[i - 1].position < MIN_GAP) {
    await Model.bulkWrite(others.map((o, k) => ({ updateOne: { filter: { _id: o._id }, update: { position: STEP * (k + 1) } } })));
    others = await load();
  }
  return positionFor(others, i);
}

// Position after the last active item, for appending.
export async function endPosition(Model, filter) {
  const last = await Model.findOne(filter).sort({ position: -1 }).select('position');
  return last ? last.position + STEP : STEP;
}
