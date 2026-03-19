import React from 'react';

// Derinlik ne olursa olsun: root=0, reply=1 (sabit 20px indent)
function flattenComments(comments) {
  const list = Array.isArray(comments) ? comments : [];
  const byId = new Map();
  list.forEach((c) => byId.set(String(c._id), c));

  const childrenByParent = new Map();
  list.forEach((c) => {
    const parentId =
      c.parentComment && typeof c.parentComment === 'object'
        ? String(c.parentComment._id)
        : c.parentComment
        ? String(c.parentComment)
        : null;

    const key = parentId || '__root__';
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key).push(c);
  });

  const sortFn = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);
  childrenByParent.forEach((arr) => arr.sort(sortFn));

  const out = [];

  const pushThread = (comment, parentAuthorName, depthFlag) => {
    out.push({
      ...comment,
      __depth: depthFlag,
      __parentAuthorName: parentAuthorName || null,
    });
    const cid = String(comment._id);
    const kids = childrenByParent.get(cid) || [];
    kids.forEach((child) => {
      const parentName = comment.author?.username || null;
      pushThread(child, parentName, 1);
    });
  };

  (childrenByParent.get('__root__') || []).forEach((root) => {
    pushThread(root, null, 0);
  });

  return out;
}

export default function CommentThread({
  comments,
  replyingToId,
  onReplyToggle,
  replyTextById,
  getReplyText,
  onReplyTextChange,
  setReplyText,
  onReplySubmit,
  onReplyCancel,
  sendingForPost,
  currentUserId,
  onMessageUser,
}) {
  const flat = flattenComments(comments);
  const readText = (id) => {
    if (typeof getReplyText === 'function') return getReplyText(id) || '';
    return (replyTextById && replyTextById[id]) || '';
  };
  const writeText = (id, value) => {
    if (typeof setReplyText === 'function') return setReplyText(id, value);
    if (typeof onReplyTextChange === 'function') return onReplyTextChange(id, value);
  };

  return (
    <div className="space-y-1.5">
      {flat.length === 0 && (
        <p className="text-xs text-slate-500">Henüz yorum yok.</p>
      )}

      {flat.map((c) => {
        const id = String(c._id);
        const isReply = c.__depth > 0;
        const isReplying = String(replyingToId || '') === id;

        const mentionName =
          (c.parentComment &&
            typeof c.parentComment === 'object' &&
            c.parentComment.author?.username) ||
          c.__parentAuthorName ||
          null;

        return (
          <div
            key={id}
            className={
              isReply
                ? 'ml-5 pl-3 border-l-2 border-gray-700/50'
                : ''
            }
          >
            <div className="text-xs text-slate-200 flex flex-wrap gap-2 items-center">
              <span className="font-medium text-sky-300 shrink-0">
                {c.author?.username || 'Anonim'}
              </span>

              {mentionName && (
                <span className="text-[11px] text-slate-400">
                  ➔ <span className="text-sky-300/80">@{mentionName}</span>
                </span>
              )}

              <span className="text-slate-300"> {c.text}</span>

              <span className="text-slate-500 shrink-0">
                {new Date(c.createdAt).toLocaleString('tr-TR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>

              <button
                type="button"
                onClick={() => onReplyToggle(id)}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition"
              >
                Yanıtla
              </button>
              {typeof onMessageUser === 'function' &&
                c.author?._id &&
                String(c.author._id) !== String(currentUserId || '') && (
                  <button
                    type="button"
                    onClick={() => onMessageUser(String(c.author._id))}
                    className="text-[11px] text-sky-400/90 hover:text-sky-300 transition"
                  >
                    Mesaj gönder
                  </button>
                )}
            </div>

            {isReplying && (
              <div className="mt-2 flex gap-2 items-center">
                <input
                  type="text"
                  value={readText(id)}
                  onChange={(e) => writeText(id, e.target.value)}
                  placeholder="Yanıt yaz..."
                  className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onReplySubmit(id);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => onReplySubmit(id)}
                  disabled={
                    sendingForPost ||
                    !(readText(id).trim())
                  }
                  className="rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 text-xs font-semibold px-3 py-2 transition"
                >
                  {sendingForPost ? '...' : 'Gönder'}
                </button>
                <button
                  type="button"
                  onClick={() => onReplyCancel(id)}
                  className="rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 border border-slate-700 transition"
                >
                  Vazgeç
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

