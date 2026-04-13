const { validationResult } = require("express-validator");
const pool = require("../models/database");

// ── helpers ───────────────────────────────────────────────────────────────────

/** Fetch and attach tag objects to a note row */
async function attachTags(note) {
  const [tags] = await pool.execute(
    `SELECT t.id, t.name, t.color
     FROM tags t
     JOIN note_tags nt ON nt.tag_id = t.id
     WHERE nt.note_id = ?`,
    [note.id],
  );
  return { ...note, tags };
}

/** Resolve or create tags by name, return array of tag ids */
async function resolveTagIds(tagNames = []) {
  const ids = [];
  for (const raw of tagNames) {
    const name = typeof raw === 'string' ? raw : raw?.name;
    if (!name || typeof name !== 'string') continue;
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) continue;
    const [existing] = await pool.execute(
      "SELECT id FROM tags WHERE name = ?",
      [trimmed],
    );
    if (existing.length > 0) {
      ids.push(existing[0].id);
    } else {
      const [res] = await pool.execute("INSERT INTO tags (name) VALUES (?)", [
        trimmed,
      ]);
      ids.push(res.insertId);
    }
  }
  return ids;
}

/** Replace all tags for a note */
async function syncTags(noteId, tagIds) {
  await pool.execute("DELETE FROM note_tags WHERE note_id = ?", [noteId]);
  for (const tagId of tagIds) {
    await pool.execute(
      "INSERT IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)",
      [noteId, tagId],
    );
  }
}

/** Snapshot current note content into version history */
async function snapshotVersion(noteId) {
  const [rows] = await pool.execute(
    "SELECT title, content FROM notes WHERE id = ?",
    [noteId],
  );
  if (rows.length > 0) {
    const { title, content } = rows[0];
    await pool.execute(
      "INSERT INTO note_versions (note_id, title, content) VALUES (?, ?, ?)",
      [noteId, title, content],
    );
  }
}

// ── controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/notes
 * Supports: ?search=, ?tag=, ?page=, ?limit=, ?pinned=
 */
async function listNotes(req, res) {
  const userId = req.user.id;
  // Ensure page and limit are always valid numbers
  const page = Number.isNaN(Number(req.query.page))
    ? 1
    : parseInt(req.query.page);
  const limit = Number.isNaN(Number(req.query.limit))
    ? 20
    : parseInt(req.query.limit);
  const offset = (page - 1) * limit;
  const { search, tag, pinned } = req.query;

  try {
    let rows, totalRows;

    if (search && search.trim()) {
      // MySQL FULLTEXT search (BOOLEAN MODE allows prefix matching with *)
      const ftsQuery = search
        .trim()
        .split(/\s+/)
        .map((w) => `+${w}*`)
        .join(" ");
      [rows] = await pool.query(
        `SELECT * FROM notes
         WHERE user_id = ?
           AND MATCH(title, content) AGAINST(? IN BOOLEAN MODE)
         ORDER BY is_pinned DESC, updated_at DESC
         LIMIT ? OFFSET ?`,
        [userId, ftsQuery, limit, offset],
      );
      [[{ cnt: totalRows }]] = await pool.execute(
        `SELECT COUNT(*) AS cnt FROM notes
         WHERE user_id = ? AND MATCH(title, content) AGAINST(? IN BOOLEAN MODE)`,
        [userId, ftsQuery],
      );
    } else if (tag) {
      [rows] = await pool.query(
        `SELECT DISTINCT n.* FROM notes n
         JOIN note_tags nt ON nt.note_id = n.id
         JOIN tags t ON t.id = nt.tag_id
         WHERE n.user_id = ? AND t.name = ?
         ORDER BY n.is_pinned DESC, n.updated_at DESC
         LIMIT ? OFFSET ?`,
        [userId, tag.toLowerCase(), limit, offset],
      );
      [[{ cnt: totalRows }]] = await pool.execute(
        `SELECT COUNT(DISTINCT n.id) AS cnt FROM notes n
         JOIN note_tags nt ON nt.note_id = n.id
         JOIN tags t ON t.id = nt.tag_id
         WHERE n.user_id = ? AND t.name = ?`,
        [userId, tag.toLowerCase()],
      );
    } else {
      const pinnedClause = pinned !== undefined ? "AND is_pinned = ?" : "";
      const pinnedParam =
        pinned !== undefined ? [pinned === "true" ? 1 : 0] : [];

      [rows] = await pool.query(
        `SELECT * FROM notes WHERE user_id = ? ${pinnedClause}
         ORDER BY is_pinned DESC, updated_at DESC
         LIMIT ? OFFSET ?`,
        [userId, ...pinnedParam, limit, offset],
      );
      [[{ cnt: totalRows }]] = await pool.execute(
        `SELECT COUNT(*) AS cnt FROM notes WHERE user_id = ? ${pinnedClause}`,
        [userId, ...pinnedParam],
      );
    }

    const notes = await Promise.all(rows.map(attachTags));

    return res.json({
      success: true,
      data: notes,
      meta: {
        total: totalRows,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalRows / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("[listNotes]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
}

/**
 * GET /api/notes/:id
 */
async function getNote(req, res) {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM notes WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id],
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Note not found." });
    return res.json({ success: true, data: await attachTags(rows[0]) });
  } catch (err) {
    console.error("[getNote]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
}

/**
 * POST /api/notes
 */
async function createNote(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  const { title = "Untitled Note", content = "", tags = [] } = req.body;

  try {
    const [result] = await pool.execute(
      "INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)",
      [req.user.id, title, content],
    );
    const noteId = result.insertId;

    if (tags.length) {
      const tagIds = await resolveTagIds(tags);
      await syncTags(noteId, tagIds);
    }

    const [rows] = await pool.execute("SELECT * FROM notes WHERE id = ?", [
      noteId,
    ]);
    const note = await attachTags(rows[0]);
    return res.status(201).json({ success: true, data: note });
  } catch (err) {
    console.error("[createNote]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
}

/**
 * PUT /api/notes/:id
 */
async function updateNote(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  try {
    const [existing] = await pool.execute(
      "SELECT * FROM notes WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id],
    );
    if (!existing.length)
      return res
        .status(404)
        .json({ success: false, message: "Note not found." });

    const note = existing[0];
    const { title, content, tags, is_pinned } = req.body;

    // Snapshot before overwriting
    await snapshotVersion(note.id);

    const newTitle = title !== undefined ? title : note.title;
    const newContent = content !== undefined ? content : note.content;
    const newPinned =
      is_pinned !== undefined ? (is_pinned ? 1 : 0) : note.is_pinned;

    await pool.execute(
      "UPDATE notes SET title = ?, content = ?, is_pinned = ? WHERE id = ?",
      [newTitle, newContent, newPinned, note.id],
    );

    if (tags !== undefined) {
      const tagIds = await resolveTagIds(tags);
      await syncTags(note.id, tagIds);
    }

    const [updated] = await pool.execute("SELECT * FROM notes WHERE id = ?", [
      note.id,
    ]);
    return res.json({ success: true, data: await attachTags(updated[0]) });
  } catch (err) {
    console.error("[updateNote]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
}

/**
 * DELETE /api/notes/:id
 */
async function deleteNote(req, res) {
  try {
    const [existing] = await pool.execute(
      "SELECT id FROM notes WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id],
    );
    if (!existing.length)
      return res
        .status(404)
        .json({ success: false, message: "Note not found." });

    await pool.execute("DELETE FROM notes WHERE id = ?", [existing[0].id]);
    return res.json({ success: true, message: "Note deleted." });
  } catch (err) {
    console.error("[deleteNote]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
}

/**
 * GET /api/notes/:id/versions
 */
async function listVersions(req, res) {
  try {
    const [note] = await pool.execute(
      "SELECT id FROM notes WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id],
    );
    if (!note.length)
      return res
        .status(404)
        .json({ success: false, message: "Note not found." });

    const [versions] = await pool.execute(
      "SELECT * FROM note_versions WHERE note_id = ? ORDER BY saved_at DESC LIMIT 50",
      [note[0].id],
    );
    return res.json({ success: true, data: versions });
  } catch (err) {
    console.error("[listVersions]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
}

/**
 * POST /api/notes/:id/versions/:versionId/restore
 */
async function restoreVersion(req, res) {
  try {
    const [noteRows] = await pool.execute(
      "SELECT * FROM notes WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id],
    );
    if (!noteRows.length)
      return res
        .status(404)
        .json({ success: false, message: "Note not found." });

    const [versionRows] = await pool.execute(
      "SELECT * FROM note_versions WHERE id = ? AND note_id = ?",
      [req.params.versionId, noteRows[0].id],
    );
    if (!versionRows.length)
      return res
        .status(404)
        .json({ success: false, message: "Version not found." });

    const version = versionRows[0];

    // Snapshot current before restoring
    await snapshotVersion(noteRows[0].id);

    await pool.execute("UPDATE notes SET title = ?, content = ? WHERE id = ?", [
      version.title,
      version.content,
      noteRows[0].id,
    ]);

    const [updated] = await pool.execute("SELECT * FROM notes WHERE id = ?", [
      noteRows[0].id,
    ]);
    return res.json({ success: true, data: await attachTags(updated[0]) });
  } catch (err) {
    console.error("[restoreVersion]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
}

/**
 * GET /api/notes/tags
 */
async function listTags(req, res) {
  try {
    const [tags] = await pool.execute(
      `SELECT t.id, t.name, t.color, COUNT(nt.note_id) AS note_count
       FROM tags t
       JOIN note_tags nt ON nt.tag_id = t.id
       JOIN notes n ON n.id = nt.note_id
       WHERE n.user_id = ?
       GROUP BY t.id
       ORDER BY t.name`,
      [req.user.id],
    );
    return res.json({ success: true, data: tags });
  } catch (err) {
    console.error("[listTags]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
}

module.exports = {
  listNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  listVersions,
  restoreVersion,
  listTags,
};
