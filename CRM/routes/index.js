var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var moment = require('moment');
var router = express.Router();
var async = require('async');

/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', { user : req.user });
});

/* GET login page. */
router.get('/login', function(req, res) {
    res.render('login', { user : req.user });
});

/* Reroute after Login Successful. */
router.post('/login', passport.authenticate('local'), function(req, res) {
    res.redirect('/home');
});

/* GET Register page. */
router.get('/register', function(req, res) {
    res.render('register', { });
});


/* Register User */
router.post('/register', function(req, res) {
    Account.register(new Account({ username : req.body.username }), req.body.password, function(err, account) {
        if (err) {
            return res.render('register', { account : account });
        }

        passport.authenticate('local')(req, res, function () {
            res.redirect('/');
        });
    });
});

/* Reroute after Logout Successful. */
router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

/* Test page */
router.get('/ping', function(req, res){
    res.status(200).send("pong!");
});


/* GET Agents for Client Entry Form. */
router.get('/client-entry', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Set our collection
    var collection = db.get('Agents');

    collection.find({},{},function(e,docs){
        res.render('client-entry', {
            "agentList" : docs,
            user : req.user.username
        });
    });
});


/* GET Clients for Contact Entry Form. */
router.get('/contact-entry', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Set our collection
    var collection = db.get('Clients');

    collection.find({},{},function(e,docs){
        res.render('contact-entry', {
            "clientList" : docs,
            user:req.user.username
        });
    });
});


/* GET Clients for Event Entry Form. */
router.get('/event-entry', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    var locals = {};
    locals.user = req.user.username;
    var tasks = [
        // Load clients
        function(callback) {
            var collection1 = db.get('Clients');

            collection1.find({},{},function(e,clients){
                if (e) return callback(err);
                locals.clients = clients;
                callback();
            })
        },
        // Load agents
        function(callback) {
            var collection2 = db.get('Agents');

            collection2.find({},{},function(e,agents){
                if (e) return callback(err);
                locals.agents = agents;
                callback();
            })
        }
    ];

    async.parallel(tasks, function(err) { //This function gets called after the two tasks have called their "task callbacks"
        if (err) return next(err); //If an error occurred, let express handle it by calling the `next` function
        // Here `locals` will be an object with `users` and `colors` keys
        // Example: `locals = {users: [...], colors: [...]}`
        db.close();
        res.render('event-entry', locals);
    });
});

/* GET Agents for Activity Report Form. */
router.get('/activity-report', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Set our collection
    var collection = db.get('Agents');

    collection.find({},{},function(e,docs){
        res.render('activity-report', {
            "agentList" : docs,
            user:req.user.username
        });
    });
});

/* GET Agents for Visit Count Report Form. */
router.get('/visit-count-report', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Set our collection
    var collection = db.get('Agents');

    collection.find({},{},function(e,docs){
        res.render('visit-count-report', {
            "agentList" : docs,
            user:req.user.username
        });
    });
});

/* GET Agents for Client List Report Form. */
router.get('/client-list-report', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Set our collection
    var collection = db.get('Agents');

    collection.find({},{},function(e,docs){
        res.render('client-list-report', {
            "agentList" : docs,
            user:req.user.username
        });
    });
});

/* GET Clients for Contact History Report Form. */
router.get('/contact-history-report', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Set our collection
    var collection = db.get('Clients');

    collection.find({},{},function(e,docs){
        res.render('contact-history-report', {
            "clientList" : docs,
            user:req.user.username
        });
    });
});

/* GET Clients for Client History Report Form. */
router.get('/client-history-report', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Set our collection
    var collection = db.get('Clients');

    collection.find({},{},function(e,docs){
        res.render('client-history-report', {
            "clientList" : docs,
            user:req.user.username
        });
    });
});


/* POST to Add Clients */
router.post('/addClient', function(req, res) {

    // Set our internal DB variable
    var db = req.db;
    // Get our form values. These rely on the "name" attributes
    var username = req.user.username;
    var clientName = req.body.clientName;
    var assignedAgent = req.body.agentAbbrev;
    var clientPhone = req.body.clientPhone;
    var clientFax = req.body.clientFax;
    var clientAddress = req.body.clientAddress;
    var clientDelivAddress = req.body.clientDelivAddress;
    var clientEmail1 = req.body.clientEmail1;
    var clientEmail2 = req.body.clientEmail2;
    var clientProdOX = req.body.clientProdOX;
        if (clientProdOX != "true") {
            clientProdOX = "false";
        }
    var clientProdPP = req.body.clientProdPP;
        if (clientProdPP != "true") {
            clientProdPP = "false";
        }
    var clientProdTP = req.body.clientProdTP;
        if (clientProdTP != "true") {
            clientProdTP = "false";
        }
    var clientNotes = req.body.clientNotes;
    var currentDateTime = moment();
    var defaultStatus = true;

    // Set our collection
    var collection = db.get('Clients');

    // Submit to the DB
    collection.insert({
        "clientName" : clientName,
        "assignedAgent" : assignedAgent,
        "clientPhone" : clientPhone,
        "clientFax" : clientFax,
        "clientAddress" : clientAddress,
        "clientDelivAddress" : clientDelivAddress,
        "clientEmail1" : clientEmail1,
        "clientEmail2" : clientEmail2,
        "clientProdOX" : clientProdOX,
        "clientProdPP" : clientProdPP,
        "clientProdTP" : clientProdTP,
        "clientNotes" : clientNotes,
        "createdBy" : username,
        "createDate" : currentDateTime,
        "clientActive" : defaultStatus


    }, function (err, doc) {
        if (err) {
            // If it failed, return error
            res.send("There was a problem adding the information to the database.");
        }
        else {
            // And forward to success page
            res.redirect("/home");
        }
    });

});



/* POST to Add Contacts */
router.post('/addContact', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Get our form values. These rely on the "name" attributes
    var clientID = req.body.clientID;
    var username = req.user.username;
    var contactFirstName = req.body.contactFirstName;
    var contactLastName = req.body.contactLastName;
    var contactPosition = req.body.contactPosition;
    var contactPhone = req.body.contactPhone;
    var contactMobile = req.body.contactMobile;
    var contactEmail = req.body.contactEmail;
    var contactNotes = req.body.contactNotes;
    var currentDateTime = moment();
    var defaultStatus = true;

    // Set our collection
    var collection = db.get('Contacts');

    // Submit to the DB
    collection.insert({
        "contactClientID" : clientID,
        "contactFirstName" : contactFirstName,
        "contactLastName" : contactLastName,
        "contactPosition" : contactPosition,
        "contactPhone" : contactPhone,
        "contactMobile" : contactMobile,
        "contactEmail" : contactEmail,
        "contactNotes" : contactNotes,
        "createdBy" : username,
        "createDate" : currentDateTime,
        "contactActive" : defaultStatus
    }, function (err, doc) {
        if (err) {
            // If it failed, return error
            res.send("There was a problem adding the information to the database.");
        }
        else {
            // And forward to success page
            res.redirect("/home");
        }
    });

});


/* POST to Add Agents */
router.post('/addAgent', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Get our form values. These rely on the "name" attributes
    var agentAbbrev = req.body.agentAbbrev;
    var username = req.user.username;
    var agentFirstName = req.body.agentFirstName;
    var agentLastName = req.body.agentLastName;
    var agentPosition = req.body.agentPosition;
    var agentPhone = req.body.agentPhone;
    var currentDateTime = moment();
    var defaultStatus = true;

    // Set our collection
    var collection = db.get('Agents');

    // Submit to the DB
    collection.insert({
        "agentAbbrev" : agentAbbrev,
        "agentFirstName" : agentFirstName,
        "agentLastName" : agentLastName,
        "agentPosition" : agentPosition,
        "agentPhone" : agentPhone,
        "createdBy" : username,
        "createDate" : currentDateTime,
        "agentActive" : defaultStatus
    }, function (err, doc) {
        if (err) {
            // If it failed, return error
            res.send("There was a problem adding the information to the database.");
        }
        else {
            // And forward to success page
            res.redirect("/home");
        }
    });

});


/* POST to Add Event */
router.post('/addEvent', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Get our form values. These rely on the "name" attributes
    var eventType = req.body.eventType;
    var username = req.user.username;
    var eventBranch = req.body.eventBranch;
    var eventDate = req.body.eventDate;
    var eventDateTimeIn = moment(eventDate.concat(' ', req.body.eventTimeIn), 'YYYY-MM-DD HH-mm');
    var eventDateTimeOut = moment(eventDate.concat(' ', req.body.eventTimeOut), 'YYYY-MM-DD HH-mm');  
    var eventDuration = parseInt(moment.duration(eventDateTimeOut.diff(eventDateTimeIn)).asMinutes());
    console.log(eventDuration);
    var eventRemarks = req.body.eventRemarks;
    var currentDateTime = moment();
    // Set our collection
    var collection = db.get('Events');

    // Submit to the DB
    collection.insert({
        "eventType" : eventType,
        "eventBranch" : eventBranch,
        "eventTimeIn" : eventDateTimeIn,
        "eventTimeOut" : eventDateTimeOut,
        "eventDuration" : eventDuration,
        "eventRemarks" : eventRemarks,
        "createdBy" : username,
        "createDate" : currentDateTime,
    }, function (err, doc) {
        if (err) {
            // If it failed, return error
            res.send("There was a problem adding the information to the database.");
        }
        else {
            // And forward to success page
            res.redirect("/home");
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
            "clientList" : docs,
            user:req.user.username
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
            "contactList" : docs,
            user:req.user.username
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
            "agentList" : docs,
            user:req.user.username
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
            "eventList" : docs,
            user:req.user.username
        });
    });
});



module.exports = router;
