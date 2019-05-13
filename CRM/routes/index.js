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
    var clientName = req.body.clientName;
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
    var currentDateTime = new Date();
    var defaultStatus = true;

    // Set our collection
    var collection = db.get('Clients');

    // Submit to the DB
    collection.insert({
        "clientName" : clientName,
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
        "createDate" : currentDateTime,
        "clientActive" : defaultStatus


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
    var contactFirstName = req.body.contactFirstName;
    var contactLastName = req.body.contactLastName;
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
        "contactFirstName" : contactFirstName,
        "contactLastName" : contactLastName,
        "contactPosition" : contactPosition,
        "contactPhone" : contactPhone,
        "contactMobile" : contactMobile,
        "contactEmail" : contactEmail,
        "contactNotes" : contactNotes,
        "createDate" : currentDateTime,
        "contactActive" : defaultStatus
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
    var agentFirstName = req.body.agentFirstName;
    var agentLastName = req.body.agentLastName;
    var agentPosition = req.body.agentPosition;
    var agentPhone = req.body.agentPhone;
    var currentDateTime = new Date();
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
        "createDate" : currentDateTime,
        "agentActive" : defaultStatus
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
    var eventType = req.body.eventType;
    var eventBranch = req.body.eventBranch;
    var eventDate = req.body.eventDate;
    var eventTimeIn = req.body.eventTimeIn;
    var eventTimeOut = req.body.eventTimeOut;
    var eventRemarks = req.body.eventRemarks;

    // Set our collection
    var collection = db.get('Events');

    // Submit to the DB
    collection.insert({
        "eventType" : eventType,
        "eventBranch" : eventBranch,
        "eventDate" : eventDate,
        "eventTimeIn" : eventTimeIn,
        "eventTimeOut" : eventTimeOut,
        "eventRemarks" : eventRemarks


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



