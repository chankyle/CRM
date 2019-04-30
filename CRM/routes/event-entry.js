var express = require('express');
var router = express.Router();

/* Render event-enter view */
router.get('/', function(req, res, next) {
  res.render('event-entry');
});

module.exports = router;
