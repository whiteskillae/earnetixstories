const express = require('express');
const router = express.Router();
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { protect, requireRole } = require('../middlewares/auth');

router.route('/')
  .get(getCategories)
  .post(protect, requireRole('admin'), createCategory);

router.route('/:id')
  .put(protect, requireRole('admin'), updateCategory)
  .delete(protect, requireRole('admin'), deleteCategory);

module.exports = router;
