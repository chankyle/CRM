var express = require('express');
var router = express.Router();

/* Render Contact Entry view. */
router.get('/', function(req, res, next) {
  res.render('contact-entry');
});

module.exports = router;
