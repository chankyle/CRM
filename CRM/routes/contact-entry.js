var express = require('express');
var router = express.Router();

/* Render contact-entry veiw. */
router.get('/', function(req, res, next) {
  res.render('contact-entry');
});

module.exports = router;
