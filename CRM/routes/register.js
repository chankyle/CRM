var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var router = express.Router();


/* GET Register page. */
router.get('/register', function(req, res) {
    res.render('register', { });
});

module.exports = router;
