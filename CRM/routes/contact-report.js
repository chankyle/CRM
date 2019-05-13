var express = require('express');
var router = express.Router();

/* Render Agent-Entry vieww */
router.get('/', function(req, res, next) {
  res.render('contact-report');
});

module.exports = router;
