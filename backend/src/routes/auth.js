const { Router } = require('express');
const { body } = require('express-validator');
const { register, login, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.post(
  '/register',
  [
    body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters.'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  login
);

router.get('/me', authenticate, me);

module.exports = router;