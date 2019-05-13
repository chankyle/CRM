var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

module.exports = router;




/* POST to Add Clients */
router.post('/addClient', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Get our form values. These rely on the "name" attributes
    var userName = req.body.username;
    var userEmail = req.body.useremail;

    // Set our collection
    var collection = db.get('Clients');

    // Submit to the DB
    collection.insert({
        "username" : userName,
        "email" : userEmail
    }, function (err, doc) {
        if (err) {
            // If it failed, return error
            res.send("There was a problem adding the information to the database.");
        }
        else {
            // And forward to success page
            res.redirect("/");
        }
    });

});



/* POST to Add Contacts */
router.post('/addContact', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Get our form values. These rely on the "name" attributes
    var contactName = req.body.contactName;
    var contactPosition = req.body.contactPosition;
    var contactPhone = req.body.contactPhone;
    var contactMobile = req.body.contactMobile;
    var contactEmail = req.body.contactEmail;
    var contactNotes = req.body.contactNotes;
    var currentDateTime = new Date();
    var defaultStatus = true;

    // Set our collection
    var collection = db.get('Contacts');

    // Submit to the DB
    collection.insert({
        "Contact Name" : contactName,
        "Contact Position" : contactPosition,
        "Contact Phone" : contactPhone,
        "Contact Mobile" : contactMobile,
        "Contact Email" : contactEmail,
        "Contact Notes" : contactNotes,
        "Created On" : currentDateTime,
        "Contact Active" : defaultStatus
    }, function (err, doc) {
        if (err) {
            // If it failed, return error
            res.send("There was a problem adding the information to the database.");
        }
        else {
            // And forward to success page
            res.redirect("/");
        }
    });

});


/* POST to Add Agents */
router.post('/addAgent', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Get our form values. These rely on the "name" attributes
    var agentAbbrev = req.body.agentAbbrev;
    var agentName = req.body.agentName;
    var agentPosition = req.body.agentPosition;
    var currentDateTime = new Date();
    var defaultStatus = true;

    // Set our collection
    var collection = db.get('Agents');

    // Submit to the DB
    collection.insert({
        "Agent Abbreviation" : agentAbbrev,
        "Agent Name" : agentName,
        "Agent Position" : agentPosition,
        "Created On" : currentDateTime,
        "Agent Active" : defaultStatus
    }, function (err, doc) {
        if (err) {
            // If it failed, return error
            res.send("There was a problem adding the information to the database.");
        }
        else {
            // And forward to success page
            res.redirect("/");
        }
    });

});


/* POST to Add Event */
router.post('/addEvent', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Get our form values. These rely on the "name" attributes
    var userName = req.body.username;
    var userEmail = req.body.useremail;

    // Set our collection
    var collection = db.get('Events');

    // Submit to the DB
    collection.insert({
        "username" : userName,
        "email" : userEmail
    }, function (err, doc) {
        if (err) {
            // If it failed, return error
            res.send("There was a problem adding the information to the database.");
        }
        else {
            // And forward to success page
            res.redirect("/");
        }
    });

});



/* GET list of Clients. */
router.get('/client-report', function(req, res) {

    // Set our internal DB variable
    var db = req.db;
    
    // Set our collection
    var collection = db.get('Clients');

    collection.find({},{},function(e,docs){
        res.render('client-report', {
            "clientList" : docs
        });
    });
});

/* GET list of Contact. */
router.get('/contact-report', function(req, res) {

    // Set our internal DB variable
    var db = req.db;
    
    // Set our collection
    var collection = db.get('Contacts');

    collection.find({},{},function(e,docs){
        res.render('contact-report', {
            "contactList" : docs
        });
    });
});


/* GET list of Agents. */
router.get('/agent-report', function(req, res) {

    // Set our internal DB variable
    var db = req.db;
    
    // Set our collection
    var collection = db.get('Agents');

    collection.find({},{},function(e,docs){
        res.render('agent-report', {
            "agentList" : docs
        });
    });
});

/* GET list of Event. */
router.get('/event-report', function(req, res) {

    // Set our internal DB variable
    var db = req.db;
    
    // Set our collection
    var collection = db.get('Events');

    collection.find({},{},function(e,docs){
        res.render('event-report', {
            "eventList" : docs
        });
    });
});



