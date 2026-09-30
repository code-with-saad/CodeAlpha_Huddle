// Card shapes sent to the client. The board list gets the small "face" shape; opening a card gets the detail.
export function serializeCard(c) {
  const items = c.checklist || [];
  return {
    id: c._id,
    column: c.column,
    title: c.title,
    position: c.position,
    createdAt: c.createdAt,
    priority: c.priority,
    dueDate: c.dueDate ? c.dueDate.toISOString().slice(0, 10) : null,
    assignees: (c.assignees || []).map(String),
    labels: (c.labels || []).map(String),
    checklist: { total: items.length, done: items.filter((i) => i.done).length },
    commentCount: c.commentCount || 0,
    attachmentCount: (c.attachments || []).length,
  };
}

export function serializeCardDetail(c) {
  return {
    ...serializeCard(c),
    description: c.description,
    createdBy: String(c.createdBy),
    checklistItems: (c.checklist || []).map((i) => ({ id: i._id, text: i.text, done: i.done })),
    attachments: (c.attachments || []).map((a) => ({
      id: a._id,
      url: a.url,
      name: a.name,
      size: a.size,
      mime: a.mime,
      uploadedBy: String(a.uploadedBy),
      createdAt: a.createdAt,
    })),
  };
}

export const serializeLabel = (l) => ({ id: l._id, name: l.name, color: l.color });

export const serializeComment = (c) => ({
  id: c._id,
  card: c.card,
  author: String(c.author),
  body: c.body,
  mentions: (c.mentions || []).map(String),
  createdAt: c.createdAt,
  editedAt: c.editedAt,
});
