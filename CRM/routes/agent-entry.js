var express = require('express');
var router = express.Router();

/* Render Agent-Entry vieww */
router.get('/', function(req, res, next) {
  res.render('agent-entry');
});

module.exports = router;
