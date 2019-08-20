var express = require('express');
var router = express.Router();

/* Render Agent-Entry view */
router.get('/', function(req, res, next) {
  res.render('agent-entry', {user:req.user.username});
});

module.exports = router;
