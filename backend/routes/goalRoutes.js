const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getUserGoals,
  getGoalSips,
  getGoalContributors,
  createGoal,
  joinGoal,
  leaveGoal,
  deleteGoal,
  linkSip
} = require('../controllers/goalController');

router.use(authMiddleware);

router.get('/user/:userId', getUserGoals);
router.get('/:id/sips', getGoalSips);
router.get('/:id/contributors', getGoalContributors);
router.post('/create', createGoal);
router.post('/join', joinGoal);
router.delete('/:id/leave', leaveGoal);
router.delete('/:id', deleteGoal);
router.put('/link', linkSip);

module.exports = router;
