var express = require('express');
var router = express.Router();

/* Render Client Report view */
router.get('/', function(req, res, next) {
  res.render('home');
});

module.exports = router;
