var express = require('express');
var router = express.Router();

/* Render Agent-Entry view */
router.get('/', function(req, res, next) {
  res.render('entry-agent', {user:req.user.username});
});

module.exports = router;
