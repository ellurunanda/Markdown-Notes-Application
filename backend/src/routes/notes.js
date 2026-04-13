const { Router } = require('express');
const { body } = require('express-validator');
const {
  listNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  listVersions,
  restoreVersion,
  listTags,
} = require('../controllers/notesController');
const { authenticate } = require('../middleware/auth');

const router = Router();

// All notes routes require authentication
router.use(authenticate);

// Tags
router.get('/tags', listTags);

// Notes CRUD
router.get('/', listNotes);
router.get('/:id', getNote);

router.post(
  '/',
  [
    body('title').optional().trim().isLength({ max: 255 }).withMessage('Title too long.'),
    body('content').optional().isString(),
    body('tags').optional().isArray(),
  ],
  createNote
);

router.put(
  '/:id',
  [
    body('title').optional().trim().isLength({ max: 255 }).withMessage('Title too long.'),
    body('content').optional().isString(),
    body('tags').optional().isArray(),
    body('is_pinned').optional().isBoolean(),
  ],
  updateNote
);

router.delete('/:id', deleteNote);

// Version history
router.get('/:id/versions', listVersions);
router.post('/:id/versions/:versionId/restore', restoreVersion);

module.exports = router;