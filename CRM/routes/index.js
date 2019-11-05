var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var moment = require('moment');
var router = express.Router();
var async = require('async');
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()
var urlencoderParser = bodyParser.urlencoded({ extended: false })

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
router.get('/entry-client', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Set our collection
    var collection = db.get('Agents');

    collection.find({},{},function(e,docs){
        res.render('entry-client', {
            "agentList" : docs,
            user : req.user.username
        });
    });
});

/* GET Agents for View Client Page. */
router.get('/view-client', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Set our collection
    var collection = db.get('Agents');

    collection.find({},{},function(e,docs){
        res.render('view-client', {
            "agentList" : docs,
            user : req.user.username
        });
    });
});


/* GET Clients for Contact Entry Form. */
router.get('/entry-contact', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Set our collection
    var collection = db.get('Clients');

    collection.find({},{},function(e,docs){
        res.render('entry-contact', {
            "clientList" : docs,
            user:req.user.username
        });
    });
});

/* GET Clients for View Contact Page. */
router.get('/view-contact', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Set our collection
    var collection = db.get('Clients');

    collection.find({},{},function(e,docs){
        res.render('view-contact', {
            "clientList" : docs,
            user:req.user.username
        });
    });
});


/* GET Clients for Event Entry Form. */
router.get('/entry-event', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    var locals = {};
    locals.user = req.user.username;
    var tasks = [
        // Load agents
        function(callback) {
            var collection1 = db.get('Agents');

            collection1.find({},{},function(e,agents){
                if (e) return callback(err);
                locals.agents = agents;
                callback();
            })
        },
        // Load clients
        function(callback) {
            var collection2 = db.get('Clients');

            collection2.find({},{},function(e,clients){
                if (e) return callback(err);
                locals.clients = clients;
                callback();
            })
        },
        // Load clientContacts
        function(callback) {
            var collection3 = db.get('Contacts');

            collection3.find({},{},function(e,contacts){
                if (e) return callback(err);
                locals.contacts = contacts;
                callback();
            })
        }

    ];

    async.parallel(tasks, function(err) { //This function gets called after the two tasks have called their "task callbacks"
        if (err) return next(err); //If an error occurred, let express handle it by calling the `next` function
        // Here `locals` will be an object with `users` and `colors` keys
        // Example: `locals = {users: [...], colors: [...]}`
        db.close();
        res.render('entry-event', locals);
    });
});

/* GET Agents for Activity Report Form. */
router.get('/report-activity', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Set our collection
    var collection = db.get('Agents');

    collection.find({},{},function(e,docs){
        res.render('report-activity', {
            "agentList" : docs,
            user:req.user.username
        });
    });
});

/* GET Activity Report Results*/
router.get('/result-activity-report', function(req, res) {
    res.render('result-activity-report');
});

/* POST Query to MongoDB and return Activity Report Results. */
router.post('/resultActivityReport', function(req, res) {
    // Set our internal DB variable
    var dateStartInput = moment(req.body.dateStartInput.concat(' 00:00:00'), 'YYYY-MM-DD HH-mm-ss');
    var dateEndInput = moment(req.body.dateEndInput.concat(' 23:59:59'), 'YYYY-MM-DD HH-mm-ss');
    var dateRange = req.body.dateStartInput + " - " + req.body.dateEndInput
    var db = req.db;
    var collection = db.get('Events');

    var query = { "agentAbbrev": req.body.agentSelect, "eventTimeOut._d": { $lte: dateEndInput._d}, "eventTimeIn._d": { $gte: dateStartInput._d} };
    collection.find(query,{},function(err, result){
        if (err) throw err;
        db.close();
        res.render('result-activity-report', {
            user:req.user.username,
            "result":result,
            "agent":req.body.agentSelect,
            "dateRange": dateRange
        });
    });

});

/* GET Client List Report Results*/
router.get('/result-client-list-report', function(req, res) {
    res.render('result-client-list-report');
});

/* POST Query to MongoDB and return Activity Report Results. */
router.post('/result-client-list-report', function(req, res) {
    // Set our internal DB variable

    var db = req.db;
    var collection = db.get('Clients');

    var query = { "assignedAgent": req.body.agentAbbrev };

    collection.find(query,{},function(err, result){
        if (err) throw err;
        db.close();
        res.render('result-client-list-report', {
            user:req.user.username,
            "result":result,
            "agent":req.body.agentAbbrev,
        });
    });

});

/* GET Client History Report Results*/
router.get('/result-client-history-report', function(req, res) {
    res.render('result-client-history-report');
});

/* POST Query to MongoDB and return Client History Results. */
router.post('/result-client-history-report', function(req, res) {
    // Set our internal DB variable
    var dateStartInput = moment(req.body.dateStartInput.concat(' 00:00:00'), 'YYYY-MM-DD HH-mm-ss');
    var dateEndInput = moment(req.body.dateEndInput.concat(' 23:59:59'), 'YYYY-MM-DD HH-mm-ss');
    var dateRange = req.body.dateStartInput + " - " + req.body.dateEndInput
    var db = req.db;
    var collection = db.get('Events');

    var query = { "clientName": req.body.clientSelect, "eventTimeOut._d": { $lte: dateEndInput._d}, "eventTimeIn._d": { $gte: dateStartInput._d} };


    collection.find(query,{},function(err, result){
        if (err) throw err;
        db.close();
        res.render('result-client-history-report', {
            user:req.user.username,
            "result":result,
            "clientName":req.body.clientSelect,
            "dateRange": dateRange
        });
    });

});

/* GET Contact History Report Results*/
router.get('/result-contact-history-report', function(req, res) {
    res.render('result-contact-history-report');
});

/* POST Query to MongoDB and return Contact History Results. */
router.post('/result-contact-history-report', function(req, res) {
    // Set our internal DB variable
    var dateStartInput = moment(req.body.dateStartInput.concat(' 00:00:00'), 'YYYY-MM-DD HH-mm-ss');
    var dateEndInput = moment(req.body.dateEndInput.concat(' 23:59:59'), 'YYYY-MM-DD HH-mm-ss');
    var dateRange = req.body.dateStartInput + " - " + req.body.dateEndInput
    var db = req.db;
    var collection = db.get('Events');

    var query = { $or: [ { "clientName": req.body.clientSelect, "contact1": req.body.contactID1, "eventTimeOut._d": { $lte: dateEndInput._d}, "eventTimeIn._d": { $gte: dateStartInput._d} }] };

    collection.find(query,{},function(err, result){
        if (err) throw err;
        db.close();
        res.render('result-contact-history-report', {
            user:req.user.username,
            "result":result,
            "clientName":req.body.clientSelect,
            "contactName":req.body.contactID1,
            "dateRange": dateRange,
        });
    });

});

/* GET Visit Count Report Results*/
router.get('/result-visit-count-report', function(req, res) {
    res.render('result-visit-count-report');
});

/* POST Query to MongoDB and return Activity Report Results. */
router.post('/result-visit-count-report', function(req, res) {
    // Set our internal DB variable
    var dateStartInput = moment(req.body.dateStartInput.concat(' 00:00:00'), 'YYYY-MM-DD HH-mm-ss');
    var dateEndInput = moment(req.body.dateEndInput.concat(' 23:59:59'), 'YYYY-MM-DD HH-mm-ss');
    var dateRange = req.body.dateStartInput + " - " + req.body.dateEndInput;
    var agentSelect = req.body.agentSelect;
    var db = req.db;
    var collection = db.get('Events');
    var query = ([ { $group : {_id : "$clientName", visitCount : { $sum : 1}, totalDuration : { $avg : "$eventDuration"}, eventDates : { $push : "$eventTimeIn._d"} } } ] );

    collection.aggregate(query,{},function(err, result){
        if (err) throw err;
        db.close();
        res.render('result-visit-count-report', {
            user:req.user.username,
            "result":result,
            "agentAbbrev":req.body.agentSelect,
            "dateRange": dateRange
        });
    });
});

/* GET Agents for Visit Count Report Form. */
router.get('/report-visit-count', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Set our collection
    var collection = db.get('Agents');

    collection.find({},{},function(e,docs){
        res.render('report-visit-count', {
            "agentList" : docs,
            user:req.user.username
        });
    });
});

/* GET Agents for Client List Report Form. */
router.get('/report-client-list', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Set our collection
    var collection = db.get('Agents');

    collection.find({},{},function(e,docs){
        res.render('report-client-list', {
            "agentList" : docs,
            user:req.user.username
        });
    });
});

/* GET Clients for Contact History Report Form. */
router.get('/report-contact-history', function(req, res) {


// Set our internal DB variable
    var db = req.db;

    var locals = {};
    locals.user = req.user.username;
    var tasks = [
        // Load agents
        function(callback) {
            var collection1 = db.get('Clients');

            collection1.find({},{},function(e,clients){
                if (e) return callback(err);
                locals.clients = clients;
                callback();
            })
        },
        // Load clients
        function(callback) {
            var collection2 = db.get('Contacts');

            collection2.find({},{},function(e,contacts){
                if (e) return callback(err);
                locals.contacts = contacts;
                callback();
            })
        }
    ];

    async.parallel(tasks, function(err) { //This function gets called after the two tasks have called their "task callbacks"
        if (err) return next(err); //If an error occurred, let express handle it by calling the `next` function
        // Here `locals` will be an object with `users` and `colors` keys
        // Example: `locals = {users: [...], colors: [...]}`
        db.close();
        res.render('report-contact-history', locals);
    });

});

/* GET Clients for Client History Report Form. */
router.get('/report-client-history', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Set our collection
    var collection = db.get('Clients');

    collection.find({},{},function(e,docs){
        res.render('report-client-history', {
            "clientList" : docs,
            user:req.user.username
        });
    });
});


/* GET Clients for Search Client Page. */
router.get('/search-client', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Set our collection
    var collection = db.get('Clients');

    collection.find({},{},function(e,docs){
        res.render('search-client', {
            "clientList" : docs,
            user:req.user.username
        });
    });
});

/* POST Query to MongoDB and return View Client Page Page. */
router.post('/search-client', function(req, res) {
    // Set our internal DB variable
    var result = {};
    var db = req.db;


    var tasks = [
        // Load Client
        function(callback) {
            var collection1 = db.get('Clients');

            collection1.find({ "clientName" : req.body.clientSelect },{},function(e,client){
                if (e) return callback(err);
                result.client = client;
                callback();
            })
        },
        // Load Contact
        function(callback) {
            var collection2 = db.get('Contacts');

            collection2.find({ "contactClientID" : req.body.clientSelect },{},function(e,contact){
                if (e) return callback(err);
                result.contact = contact;
                callback();
            })
        },
        // Load Contact
        function(callback) {
            var collection3 = db.get('Events');
            collection3.find({ "clientName" : req.body.clientSelect },{sort: {'createDate._d' :-1}, limit: 5},function(e,events){
                if (e) return callback(err);
                result.events = events;
                callback();
            });
        },
        // Load Agents
        function(callback) {
            var collection4 = db.get('Agents');
            collection4.find({},{},function(e,agents){
                if (e) return callback(err);
                result.agents = agents;
                callback();
            });
        },
    ];

    async.parallel(tasks, function(err) { //This function gets called after the two tasks have called their "task callbacks"
        if (err) return next(err); //If an error occurred, let express handle it by calling the `next` function
        // Here `locals` will be an object with `users` and `colors` keys
        // Example: `locals = {users: [...], colors: [...]}`
        db.close();
        res.render('view-client', {
            "result": result,
            clientName:req.body.clientSelect,
            user:req.user.username
        });
    });
});

/* POST to Add Clients */
router.post('/viewClient', function(req, res) {

    // Set our internal DB variable
    var db = req.db;
    // Get our form values. These rely on the "name" attributes
    var username = req.user.username;
    var clientName = req.body.clientName;
    var agentAbbrev = req.body.agentAbbrev;
    var clientPhone = req.body.clientPhone;
    var clientFax = req.body.clientFax;
    var clientAddress1 = new Object();
    var clientAddress2 = new Object();
    var clientAddress3 = new Object();
    var clientAddress4 = new Object();
    clientAddress1.addr = req.body.clientAddress1;
    clientAddress1.type = req.body.clientAddress1Type;
    clientAddress2.addr = req.body.clientAddress2;
    clientAddress2.type = req.body.clientAddress2Type;
    clientAddress3.addr = req.body.clientAddress3;
    clientAddress3.type = req.body.clientAddress3Type;
    clientAddress4.addr = req.body.clientAddress4;
    clientAddress4.type = req.body.clientAddress4Type;
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
    var defaultStatus = "Enabled";

    // Set our collection
    var collection = db.get('Clients');

    // Submit to the DB
    collection.update(
    {
        "clientName" : req.body.clientName
    },
    {
        "clientName" : clientName,
        "agentAbbrev" : agentAbbrev,
        "clientPhone" : clientPhone,
        "clientFax" : clientFax,
        "clientAddress1" : clientAddress1,
        "clientAddress2" : clientAddress2,
        "clientAddress3" : clientAddress3,
        "clientAddress4" : clientAddress4,
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

/* GET Clients for Search Contact Page. */
router.get('/search-contact', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Set our collection
    var collection = db.get('Clients');

    collection.find({},{},function(e,docs){
        res.render('search-contact', {
            "clientList" : docs,
            user:req.user.username
        });
    });
});

/* GET Clients for Search Event Page. */
router.get('/search-event', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    var locals = {};
    locals.user = req.user.username;
    var tasks = [
        // Load clients
        function(callback) {
            var collection2 = db.get('Clients');

            collection2.find({},{},function(e,clients){
                if (e) return callback(err);
                locals.clients = clients;
                callback();
            })
        },
        // Load clientContacts
        function(callback) {
            var collection3 = db.get('Contacts');

            collection3.find({},{},function(e,contacts){
                if (e) return callback(err);
                locals.contacts = contacts;
                callback();
            })
        }

    ];

    async.parallel(tasks, function(err) { //This function gets called after the two tasks have called their "task callbacks"
        if (err) return next(err); //If an error occurred, let express handle it by calling the `next` function
        // Here `locals` will be an object with `users` and `colors` keys
        // Example: `locals = {users: [...], colors: [...]}`
        db.close();
        res.render('search-event', locals);
    });
});

/* POST to Add Clients */
router.post('/addClient', function(req, res) {

    // Set our internal DB variable
    var db = req.db;
    // Get our form values. These rely on the "name" attributes
    var username = req.user.username;
    var clientName = req.body.clientName;
    var agentAbbrev = req.body.agentAbbrev;
    var clientPhone = req.body.clientPhone;
    var clientFax = req.body.clientFax;
    var clientAddress1 = new Object();
    var clientAddress2 = new Object();
    var clientAddress3 = new Object();
    var clientAddress4 = new Object();
    clientAddress1.addr = req.body.clientAddress1;
    clientAddress1.type = req.body.clientAddress1Type;
    clientAddress2.addr = req.body.clientAddress2;
    clientAddress2.type = req.body.clientAddress2Type;
    clientAddress3.addr = req.body.clientAddress3;
    clientAddress3.type = req.body.clientAddress3Type;
    clientAddress4.addr = req.body.clientAddress4;
    clientAddress4.type = req.body.clientAddress4Type;
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
    var defaultStatus = "Enabled";

    // Set our collection
    var collection = db.get('Clients');

    // Submit to the DB
    collection.insert({
        "clientName" : clientName,
        "agentAbbrev" : agentAbbrev,
        "clientPhone" : clientPhone,
        "clientFax" : clientFax,
        "clientAddress1" : clientAddress1,
        "clientAddress2" : clientAddress2,
        "clientAddress3" : clientAddress3,
        "clientAddress4" : clientAddress4,
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
    var defaultStatus = "Enabled";

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
    var defaultStatus = "Enabled";

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
    var clientName = req.body.clientID;
    var agentAbbrev = req.body.agentID;
    var eventDate = req.body.eventDate;
    var eventDateTimeIn = moment(eventDate.concat(' ', req.body.eventTimeIn), 'YYYY-MM-DD HH-mm');
    var eventDateTimeOut = moment(eventDate.concat(' ', req.body.eventTimeOut), 'YYYY-MM-DD HH-mm');
    var eventDuration = parseInt(moment.duration(eventDateTimeOut.diff(eventDateTimeIn)).asMinutes());
    var eventType = req.body.eventType;
    var contact1 = req.body.contactID1;
    if (contact1.valueOf() === "N/A"){
        contact1 = "";
    }
    var contact2 = req.body.contactID2;
    if (contact2.valueOf() === "N/A"){
        contact2 = "";
    }
    var eventBranch = req.body.eventBranch;
    var eventRemarks = req.body.eventRemarks;
    var username = req.user.username;
    var currentDateTime = moment();

    // Set our collection
    var collection = db.get('Events');

    // Submit to the DB
    collection.insert({
        "clientName" : clientName,
        "agentAbbrev" : agentAbbrev,
        "eventTimeIn" : eventDateTimeIn,
        "eventTimeOut" : eventDateTimeOut,
        "eventDuration" : eventDuration,
        "eventType" : eventType,
        "contact1" : contact1,
        "contact2" : contact2,
        "eventBranch" : eventBranch,
        "eventRemarks" : eventRemarks,
        "createdBy" : username,
        "createDate" : currentDateTime
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
