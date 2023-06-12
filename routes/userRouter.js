const express = require('express');
const router = express.Router();

const {
  getAllUsers,
  getCurrentUser,
  updateCurrentPassword,
  updateCurrentUser,
  deleteCurrentUser,
  getUser,
  updateUser,
  updatePassword,
  deleteUser,
  getAllProfiles,
  getCurrentProfile,
  updateCurrentProfile,
  getProfile,
  updateProfile,
} = require('../controllers/userController');

const { authorizePermissions } = require('../middlewares/authorizePermissions');

router.route('/').get(getAllUsers);
router.route('/profiles').get(getAllProfiles);
router.route('/me').get(getCurrentUser).patch(updateCurrentUser).delete(deleteCurrentUser);
router.route('/me/password').patch(updateCurrentPassword);
router.route('/me/profile').get(getCurrentProfile).patch(updateCurrentProfile);
router
  .route('/:userId')
  .get(getUser)
  .patch(authorizePermissions('admin'), updateUser)
  .delete(authorizePermissions('admin'), deleteUser);
router.route('/:userId/password').patch(authorizePermissions('admin'), updatePassword);
router.route('/:userId/profile').get(getProfile).patch(authorizePermissions('admin'), updateProfile);

module.exports = router;
