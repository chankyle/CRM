var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var moment = require('moment');
var router = express.Router();
var async = require('async');
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()
const fs = require('fs');
const csv=require('csvtojson');
const multer = require('multer');
var ObjectID = require('MongoDB').ObjectID;
var urlencoderParser = bodyParser.urlencoded({ extended: false });
const AccessControl = require('accesscontrol');
var grantsList = [];

// Set temporary csv upload location
var upload = multer({ dest: 'tmp/csv/' });


/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', { user : req.user, permissions: req.permissions});
});

/* GET login page. */
router.get('/login', function(req, res) {
    res.render('login');
});

/* GET Home page. */
router.get('/home', function(req, res) {

    // Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype active -_id"},function(e,usertype){
        if (e) return callback(err);
        if (usertype[0].active === false) {
            req.logout();
            res.redirect('/access-denied');
        } else {
            userType = usertype[0].usertype;
            collectionPermissions.find({"role" : userType},{},function(e,results){
                if (e) return callback(err);
                permissions = results;
                var ac = new AccessControl(permissions);
                const permission = ac.can(req.user.usertype).readAny('Event');
                if (ac._isLocked) {
                    // resource is forbidden for this user/role
                    res.status(403).end();
                } else {
                  // Perform what is allowed when permission is granted
                  // Set our internal DB variable
                  var result = {};
                  var db = req.db;
                  var dateToday = moment();
                  var dateLess30 = moment().subtract(30, 'days');

                  var tasks = [
                      // Load Events
                      function(callback) {
                          var collection1 = db.get('Events');
                          collection1.find( {},{},function(e,events){
                              if (e) return callback(err);
                              var eventListMonth = [];
                              var eventAgentActivity = [];
                              var eventList30 = [];
                              var clientVisit30 = [];
                              function isItemInArray(array, item) {
                                    for (var j = 0; j < array.length; j++) {
                                        // This if statement depends on the format of your array
                                        if (array[j][0] == item[0]) {
                                            return true;   // Found it
                                        }
                                    }
                                            return false;   // Not found
                                }
                                function compareCount(a, b) {
                                  var countA = a[1];
                                  var countB = b[1];
                                  let comparison = 0;
                                  if (countA > countB) return -1;
                                  if (countB > countA) return 1;
                                  return comparison;
                                }
                              for (i = 0; i < events.length; i++){
                                if (moment(events[i].eventTimeIn).isSame(dateToday, 'month') == true){
                                  eventListMonth.push(events[i]);
                                  if (isItemInArray(eventAgentActivity, [events[i].agentAbbrev,]) == false){
                                    eventAgentActivity.push([events[i].agentAbbrev,1]);
                                  } else {
                                    for (var l = 0; l < eventAgentActivity.length; l++){
                                      if (eventAgentActivity[l][0] == events[i].agentAbbrev){
                                        eventAgentActivity[l][1] = eventAgentActivity[l][1] + 1;
                                      }
                                    }
                                  }
                                }
                                eventAgentActivity.sort(compareCount);
                                if (moment(events[i].eventTimeIn).isAfter(dateLess30, 'day') == true){
                                  eventList30.push(events[i]);
                                  if (isItemInArray(clientVisit30, [events[i].clientName,]) == false){
                                    clientVisit30.push([events[i].clientName,1]);
                                  } else {
                                    for (var l = 0; l < clientVisit30.length; l++){
                                      if (clientVisit30[l][0] == events[i].clientName){
                                        clientVisit30[l][1] = clientVisit30[l][1] + 1;
                                      }
                                    }
                                  }
                                }
                                clientVisit30.sort(compareCount);
                              }
                              for (i = 0; i < clientVisit30.length; i++){
                                if (clientVisit30[i][0].length > 12){
                                  clientVisit30[i][0] = clientVisit30[i][0].split(" ", 3);

                                }
                              }
                              console.log(clientVisit30);
                              result.events = eventListMonth;
                              result.activeAgents = eventAgentActivity;
                              result.eventList30 = eventList30;
                              result.frequentClients = clientVisit30;
                              callback();
                          });
                      }
                      ];

                  async.parallel(tasks, function(err) { //This function gets called after the two tasks have called their "task callbacks"
                      if (err) return next(err); //If an error occurred, let express handle it by calling the `next` function
                      // Here `locals` will be an object with `users` and `colors` keys
                      // Example: `locals = {users: [...], colors: [...]}`
                      db.close();

                  // Set our collection
                  var collection1 = db.get('Events');
                        res.render('home', {
                          "result": result,
                          dateToday : dateToday,
                          user : req.user, permissions : results
                      });
                  });

                } 
            });
        }

    });


});


/* GET logout page. */
router.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

/* Reroute after Login Successful. */
/* POST login page. */
router.post('/login', function(req, res, next) {
  passport.authenticate('local', { successRedirect: '/home',
    failureRedirect: '/login'}, function(err, user, info) {
    if(err) {
      //res.status(403).end();
      console.log('')
      return res.render('login', {title: 'Login', error: err.message});
    }
    return req.logIn(user, function(err) {
      if(err) {
        //res.status(403).end();
        return res.render('login', {title: 'Login', error: err.message});
      } else if (user.changePwOnLogin) {
        return res.redirect('/change-password');
      } else {
        return res.redirect('/home');
      }
    });
  })(req, res, next);
}); 

/* POST to Add Agents */
router.post('/changePW', function(req, res) {
  Account.findOne({ username : req.user.username}, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('back');
    }
    user.changePassword(req.body.oldPassword, req.body.newPassword, function(err) {
        if (err) {
            return next(err) 
        }
        else {
            var db = req.db;
            var collection = db.get('accounts');


            // Submit to the DB
            collection.update(
            {
                "_id" : req.user._id
            },
            {
                $set: {
                    "changePwOnLogin" : false
                }
            }, function (err, doc) {
                if (err) {
                    // If it failed, return error
                    next(err);
                } else {
                    // And forward to success page
                    res.redirect('/');
                }
            });
        }
    }); 
  });
});


/* Display Import Agent page. */
router.get('/import-agent', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).createAny('Import');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                res.render('import-agent', {
                    user : req.user, permissions : results
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* Review Agent CSV. */
router.post('/import-agent', upload.single('agentCSV'), function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).createAny('Import');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                function getData(){
                    return new Promise(function(resolve,reject) {
                        var csvData = [];

                        // open uploaded file
                        csv()
                        .fromFile(req.file.path)
                        .then((csvData)=>{
                            fs.unlinkSync(req.file.path);  // remove temp file
                            resolve(csvData)   //resolve promise
                        })
                    })
                }

                getData().then(function(csvData){
                    var data = JSON.stringify(csvData);
                    res.render('review-agent-upload', {
                        user : req.user, permissions : results,
                        "agents" : csvData,
                        "JSONAgents" : data
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* Upload Agent CSV. */
router.post('/upload-agents', function(req, res, next) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).createAny('Import');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                var csvData = JSON.parse(req.body.csvData);
                var length = csvData.length;

                 // Set our internal DB variable
                 var db = req.db;

                // Set our collection
                var collection = db.get('Agents');


                // Get our form values. These rely on the "name" attributes
                var username = req.user.username;
                var currentDateTime = moment();
                var defaultStatus = "Enabled";


                for (i in csvData) {
                    collection.insert({
                        "agentAbbrev" : csvData[i].agentAbbrev,
                        "agentFirstName" : csvData[i].agentFirstName,
                        "agentLastName" : csvData[i].agentLastName,
                        "agentPosition" : csvData[i].agentPosition,
                        "agentPhone" : csvData[i].agentPhone,
                        "createdBy" : username,
                        "createDate" : currentDateTime,
                        "agentActive" : defaultStatus
                    }, function (err, doc) {
                        if (err) {
                            // If it failed, return error
                            next(err);
                        } else {
                            // And forward to success page
                            res.redirect('/home');
                        }
                    });
                }
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* Display Import Client page. */
router.get('/import-client', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).createAny('Import');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var db = req.db;

                // Set our collection
                var collection = db.get('Agents');

                collection.find({},{},function(e,docs){
                    res.render('import-client', {
                        "agentList" : docs,
                        user : req.user,
                        permissions : results
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* Review Client CSV. */
router.post('/import-client', upload.single('clientCSV'), function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).createAny('Import');
            if (permission.granted) {
                var defaultAgent = req.body.agentAbbrev;
                var defaultAddress1Type = req.body.clientAddress1Type;
                var defaultAddress2Type = req.body.clientAddress2Type;
                var defaultAddress3Type = req.body.clientAddress3Type;
                var defaultAddress4Type = req.body.clientAddress4Type;
                var defaultProdOX = req.body.clientProdOX;
                var defaultProdPP = req.body.clientProdPP;
                var defaultProdTP = req.body.clientProdTP;

                // Perform what is allowed when permission is granted
                function getData(){
                    return new Promise(function(resolve,reject) {
                        var csvData = [];

                        // open uploaded file
                        csv()
                        .fromFile(req.file.path)
                        .then((csvData)=>{
                            fs.unlinkSync(req.file.path);  // remove temp file
                            resolve(csvData)   //resolve promise
                        })
                    })
                }

                getData().then(function(csvData){
                    var data = JSON.stringify(csvData);

                    // Set our internal DB variable
                    var db = req.db;

                    // Set our collection
                    var collection = db.get('Agents');


                    collection.find({},{},function(e,docs){
                        res.render('review-client-upload', {
                            "defaultAgent" : defaultAgent,
                            "defaultAddress1Type" : defaultAddress1Type,
                            "defaultAddress2Type" : defaultAddress2Type,
                            "defaultAddress3Type" : defaultAddress3Type,
                            "defaultAddress4Type" : defaultAddress4Type,
                            "defaultProdOX" : defaultProdOX,
                            "defaultProdPP" : defaultProdPP,
                            "defaultProdTP" : defaultProdTP,
                            "agentList" : docs,
                            user : req.user, permissions : results,
                            "clients" : csvData,
                            "JSONClients" : data
                        });
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* Upload Client CSV. */
router.post('/upload-clients', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).createAny('Import');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                var csvData = JSON.parse(req.body.csvData);
                var length = csvData.length;

                 // Set our internal DB variable
                 var db = req.db;

                // Set our collection
                var collection = db.get('Clients');


                // Get our form values. These rely on the "name" attributes
                var username = req.user.username;
                var currentDateTime = moment();
                var defaultStatus = "Enabled";


                for (i in csvData) {
                    var str0 = "agentAbbrev[";
                    var agentAbbrev = str0.concat(i, "]");

                    var str1 = "clientAddress1Type[";
                    var clientAddress1Type = str1.concat(i, "]");

                    var str2 = "clientAddress2Type[";
                    var clientAddress2Type = str2.concat(i, "]");

                    var str3 = "clientAddress3type[";
                    var clientAddress3Type = str3.concat(i, "]");

                    var str4 = "clientAddress4type[";
                    var clientAddress4Type = str4.concat(i, "]");

                    var str5 = "clientProdOX[";
                    var strOX = str5.concat(i, "]");
                    var clientProdOX = req.body[strOX];
                    if (clientProdOX != "true") {
                        clientProdOX = "false";
                    }

                    var str6 = "clientProdPP[";
                    var strPP = str6.concat(i, "]");
                    var clientProdPP = req.body[strPP];
                    if (clientProdPP != "true") {
                        clientProdPP = "false";
                    }

                    var str7 = "clientProdTP[";
                    var strTP = str7.concat(i, "]");
                    var clientProdTP = req.body[strTP];
                    if (clientProdTP != "true") {
                        clientProdTP = "false";
                    }

                    var clientAddress1 = new Object();
                    var clientAddress2 = new Object();
                    var clientAddress3 = new Object();
                    var clientAddress4 = new Object();
                    clientAddress1.addr = csvData[i].clientAddress1;
                    clientAddress1.type = req.body[clientAddress1Type];
                    clientAddress2.addr = csvData[i].clientAddress2;
                    clientAddress2.type = req.body[clientAddress2Type];
                    clientAddress3.addr = csvData[i].clientAddress3;
                    clientAddress3.type = req.body[clientAddress3Type];
                    clientAddress4.addr = csvData[i].clientAddress4;
                    clientAddress4.type = req.body[clientAddress4Type];


                    collection.insert({
                        "clientName" : csvData[i].clientName,
                        "agentAbbrev" : req.body[agentAbbrev],
                        "clientPhone" : csvData[i].clientPhone,
                        "clientFax" : csvData[i].clientFax,
                        "clientAddress1" : clientAddress1,
                        "clientAddress2" : clientAddress2,
                        "clientAddress3" : clientAddress3,
                        "clientAddress4" : clientAddress4,
                        "clientEmail1" : csvData[i].clientEmail1,
                        "clientEmail2" : csvData[i].clientEmail2,
                        "clientProdOX" : clientProdOX,
                        "clientProdPP" : clientProdPP,
                        "clientProdTP" : clientProdTP,
                        "clientNotes" : csvData[i].clientNotes,
                        "createdBy" : username,
                        "createDate" : currentDateTime,
                        "clientActive" : defaultStatus
                    }, function (err, doc) {
                        if (err) {
                            // If it failed, return error
                            next(err);
                        } else {
                            // And forward to success page
                            res.redirect('/home');
                        }
                    });
                }
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* Display Import Contact page. */
router.get('/import-contact', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).createAny('Import');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var db = req.db;

                // Set our collection
                var collection = db.get('Clients');

                collection.find({},{},function(e,docs){
                    res.render('import-contact', {
                        "clientList" : docs,
                        user : req.user,
                        permissions : results
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* Review Contact CSV. */
router.post('/import-contact', upload.single('contactCSV'), function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).createAny('Import');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                var defaultClient = req.body.clientSelect;

                function getData(){
                    return new Promise(function(resolve,reject) {
                        var csvData = [];

                        // open uploaded file
                        csv()
                        .fromFile(req.file.path)
                        .then((csvData)=>{
                            fs.unlinkSync(req.file.path);  // remove temp file
                            resolve(csvData)   //resolve promise
                        })
                    })
                }

                getData().then(function(csvData){
                    var data = JSON.stringify(csvData);

                    // Set our internal DB variable
                    var db = req.db;

                    // Set our collection
                    var collection = db.get('Clients');

                    collection.find({},{},function(e,docs){
                        res.render('review-contact-upload', {
                            "defaultClient" : defaultClient,
                            "clientList" : docs,
                            user : req.user, permissions : results,
                            "contacts" : csvData,
                            "JSONContacts" : data
                        });
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* Upload Contact CSV. */
router.post('/upload-contacts', function(req, res, next) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).createAny('Import');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                var csvData = JSON.parse(req.body.csvData);
                var length = csvData.length;


                 // Set our internal DB variable
                 var db = req.db;

                // Set our collection
                var collection = db.get('Contacts');


                // Get our form values. These rely on the "name" attributes
                var username = req.user.username;
                var currentDateTime = moment();
                var defaultStatus = "Enabled";


                for (i in csvData) {
                    var str = "contactClientID[";
                    var clientID = str.concat(i, "]");
                    collection.insert({
                        "contactClientID" : req.body[clientID],
                        "contactFirstName" : csvData[i].contactFirstName,
                        "contactLastName" : csvData[i].contactLastName,
                        "contactPosition" : csvData[i].contactPosition,
                        "contactPhone" : csvData[i].contactPhone,
                        "contactMobile" : csvData[i].contactMobile,
                        "contactEmail" : csvData[i].contactEmail,
                        "contactNotes" : csvData[i].contactNotes,
                        "createdBy" : username,
                        "createDate" : currentDateTime,
                        "contactActive" : defaultStatus,
                    }, function (err, doc) {
                        if (err) {
                            // If it failed, return error
                            next(err);
                        } else {
                            // And forward to success page
                            res.redirect('/home');
                        }
                    });
                }
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* GET Client Entry Form. */
router.get('/entry-client', function(req, res) {
    // Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).createAny('Client');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var db = req.db;

                // Set our collection
                var collection = db.get('Agents');

                collection.find({},{},function(e,docs){
                    res.render('entry-client', {
                        "agentList" : docs,
                        user : req.user, permissions : results,
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* GET Agents for View Client Page. */
router.get('/view-client', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Client');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                 // Set our internal DB variable
                 var db = req.db;

                // Set our collection
                var collection = db.get('Agents');

                collection.find({},{},function(e,docs){
                    res.render('view-client', {
                        "agentList" : docs,
                        user : req.user
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });


});

/* GET Clients for Contact Entry Form. */
router.get('/entry-contact', function(req, res) {
    // Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).createAny('Contact');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var db = req.db;

                // Set our collection
                var collection = db.get('Clients');

                collection.find({},{},function(e,docs){
                    res.render('entry-contact', {
                        "clientList" : docs,
                        user : req.user, permissions : results
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* GET Clients for View Contact Page. */
router.get('/view-contact', function(req, res) {
    // Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
                if (e) return callback(err);
                permissions = results;
                var ac = new AccessControl(permissions);
                const permission = ac.can(req.user.usertype).readAny('Contact');
                if (permission.granted) {
                    // Set our collection
                    var collection3 = db.get('Clients');
                    collection.find({},{},function(e,docs){
                        res.render('view-contact', {
                            "clientList" : docs,
                            user : req.user, permissions : results,
                            permissions : results
                        });
                    });
                } else {
                    // resource is forbidden for this user/role
                    res.status(403).end();
                }
            });
    });

});

/* GET Clients for Event Entry Form. */
router.get('/entry-event', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).createAny('Event');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
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

                async.parallel(tasks, function(err) { //This function gets called after the three tasks have called their "task callbacks"
                    if (err) return next(err); //If an error occurred, let express handle it by calling the `next` function
                    // Here `locals` will be an object with `users` and `colors` keys
                    // Example: `locals = {users: [...], colors: [...]}`
                    db.close();
                    res.render('entry-event', {
                        locals,
                        user : req.user, permissions : results
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* GET Agents for Activity Report Form. */
router.get('/report-activity', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Event');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var db = req.db;

                // Set our collection
                var collection = db.get('Agents');

                collection.find({},{},function(e,docs){
                    res.render('report-activity', {
                        "agentList" : docs,
                        user : req.user, permissions : results
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* GET Activity Report Results*/
router.get('/result-activity-report', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Event');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                res.render('result-activity-report', {
                    user : req.user, permissions : results
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* POST Query to MongoDB and return Activity Report Results. */
router.post('/resultActivityReport', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Event');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var dateStartInput = moment(req.body.dateStartInput.concat(' 00:00:00'), 'YYYY-MM-DD HH-mm-ss');
                var dateEndInput = moment(req.body.dateEndInput.concat(' 23:59:59'), 'YYYY-MM-DD HH-mm-ss');
                var dateRange = req.body.dateStartInput + " - " + req.body.dateEndInput;
                var db = req.db;
                var collection = db.get('Events');
                var query = { "agentAbbrev": req.body.agentSelect, "eventTimeIn._d": { $lte: new Date(dateEndInput._d)}, "eventTimeIn._d": { $gte: new Date(dateStartInput._d)} };
                collection.find(query,{},function(err, result){
                    if (err) throw err;
                    db.close();
                    res.render('result-activity-report', {
                        user : req.user, permissions : results,
                        "result":result,
                        "agent":req.body.agentSelect,
                        "dateRange": dateRange
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* GET Client List Report Results*/
router.get('/result-client-list-report', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Client');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                res.render('result-client-list-report', {
                    user : req.user, permissions : results
                });

            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* POST Query to MongoDB and return Activity Report Results. */
router.post('/result-client-list-report', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Client');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var db = req.db;
                var collection = db.get('Clients');

                var query = { "agentAbbrev": req.body.agentAbbrev };

                collection.find(query,{},function(err, result){
                    if (err) throw err;
                    db.close();
                    res.render('result-client-list-report', {
                        user : req.user, permissions : results,
                        "result":result,
                        "agent":req.body.agentAbbrev,
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* GET Client History Report Results*/
router.get('/result-client-history-report', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Client');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                res.render('result-client-history-report', {
                    user : req.user, permissions : results
                });

            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* POST Query to MongoDB and return Client History Results. */
router.post('/result-client-history-report', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Client');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var dateStartInput = moment(req.body.dateStartInput.concat(' 00:00:00'), 'YYYY-MM-DD HH-mm-ss');
                var dateEndInput = moment(req.body.dateEndInput.concat(' 23:59:59'), 'YYYY-MM-DD HH-mm-ss');
                var dateRange = req.body.dateStartInput + " - " + req.body.dateEndInput
                var db = req.db;
                var collection = db.get('Events');
                var query = { "clientName": req.body.clientSelect, "eventTimeIn._d": { $lte: new Date(dateEndInput._d)}, "eventTimeIn._d": { $gte: new Date(dateStartInput._d)} };


                collection.find(query,{},function(err, result){
                    if (err) throw err;
                    db.close();
                    res.render('result-client-history-report', {
                        user : req.user, permissions : results,
                        "result":result,
                        "clientName":req.body.clientSelect,
                        "dateRange": dateRange
                    });
                });

            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* GET Contact History Report Results*/
router.get('/result-contact-history-report', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Contact');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                res.render('result-contact-history-report', {
                    user : req.user, permissions : results
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* POST Query to MongoDB and return Contact History Results. */
router.post('/result-contact-history-report', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Contact');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var dateStartInput = moment(req.body.dateStartInput.concat(' 00:00:00'), 'YYYY-MM-DD HH-mm-ss');
                var dateEndInput = moment(req.body.dateEndInput.concat(' 23:59:59'), 'YYYY-MM-DD HH-mm-ss');
                var dateRange = req.body.dateStartInput + " - " + req.body.dateEndInput
                var db = req.db;
                var collection = db.get('Events');
                var query = { $or: [ { "clientName": req.body.clientSelect, "contact1": req.body.contactID1, "eventTimeIn._d": { $lte: new Date(dateEndInput._d)}, "eventTimeIn._d": { $gte: new Date (dateStartInput._d)} }] };

                collection.find(query,{},function(err, result){
                    if (err) throw err;
                    db.close();
                    res.render('result-contact-history-report', {
                        user : req.user, permissions : results,
                        "result":result,
                        "clientName":req.body.clientSelect,
                        "contactName":req.body.contactID1,
                        "dateRange": dateRange,
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* GET Visit Count Report Results*/
router.get('/result-visit-count-report', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Event');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                res.render('result-visit-count-report', {
                    user : req.user, permissions : results
                });

            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* POST Query to MongoDB and return Activity Report Results. */
router.post('/result-visit-count-report', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Event');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var dateStartInput = moment(req.body.dateStartInput.concat(' 00:00:00'), 'YYYY-MM-DD HH-mm-ss');
                var dateEndInput = moment(req.body.dateEndInput.concat(' 23:59:59'), 'YYYY-MM-DD HH-mm-ss');
                var dateRange = req.body.dateStartInput + " - " + req.body.dateEndInput;
                var db = req.db;
                var collection = db.get('Events');
                var query = ([ {$match : {$and : [{"agentAbbrev":req.body.agentSelect}, {"eventTimeIn._d": { $lte: new Date(dateEndInput._d)}}, {"eventTimeIn._d": { $gte: new Date (dateStartInput._d)}}]}}, { $group : {_id : "$clientName", visitCount : { $sum : 1}, totalDuration : { $sum : "$eventDuration"}, eventDates : { $push : "$eventTimeIn._d"} } } ] );

                collection.aggregate(query,{},function(err, result){
                    if (err) throw err;
                    db.close();
                    res.render('result-visit-count-report', {
                        user : req.user, permissions : results,
                        "result":result,
                        "agentAbbrev":req.body.agentSelect,
                        "dateRange": dateRange
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* GET Agents for Visit Count Report Form. */
router.get('/report-visit-count', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Event');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var db = req.db;

                // Set our collection
                var collection = db.get('Agents');

                collection.find({},{},function(e,docs){
                    res.render('report-visit-count', {
                        "agentList" : docs,
                        user : req.user, permissions : results
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* GET Agents for Client List Report Form. */
router.get('/report-client-list', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Client');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var db = req.db;

                // Set our collection
                var collection = db.get('Agents');

                collection.find({},{},function(e,docs){
                    res.render('report-client-list', {
                        "agentList" : docs,
                        user : req.user, permissions : results
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* GET Clients for Contact History Report Form. */
router.get('/report-contact-history', function(req, res) {
    // Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Contact');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
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
                    res.render('report-contact-history', {
                        locals,
                        user : req.user, permissions : results
                    });
                });

            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* GET Clients for Client History Report Form. */
router.get('/report-client-history', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Client');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var db = req.db;

                // Set our collection
                var collection = db.get('Clients');

                collection.find({},{},function(e,docs){
                    res.render('report-client-history', {
                        "clientList" : docs,
                        user : req.user, permissions : results
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* GET Clients for Search Client Page. */
router.get('/search-client', function(req, res) {
    // Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Client');

            if (permission.granted) {
                // Set our internal DB variable
                var db = req.db;

                // Set our collection
                var collection = db.get('Clients');

                collection.find({},{},function(e,docs){
                    res.render('search-client', {
                        "clientList" : docs,
                        user : req.user, permissions : results
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* POST Query to MongoDB and return View Client Page Page. */
router.post('/search-client', function(req, res) {

    // Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Client');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
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

                        collection2.find({ "contactClientID" : req.body.clientSelect },{contactFirstName : 1, contactLastName : 1},function(e,contact){
                            if (e) return callback(err);
                            result.contact = contact;
                            callback();
                        })
                    },
                    // Load Events
                    function(callback) {
                        var collection3 = db.get('Events');
                        collection3.find({ "clientName" : req.body.clientSelect },{sort: {'eventTimeIn._d' :-1}, limit: 5},function(e,events){
                            if (e) return callback(err);
                            result.events = events;
                            callback();
                        });
                    },
                    // Load Agents
                    function(callback) {
                        var collection4 = db.get('Agents');
                        collection4.find({},{ agentAbbrev : 1},function(e,agents){
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
                        user : req.user, permissions : results
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* POST to Edit Clients */
router.post('/viewClient', function(req, res) {

// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).updateAny('Client');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var db = req.db;
                // Get our form values. These rely on the "name" attributes
                var username = req.user.username;
                var newClientName = req.body.newClientName;
                var origClientName = req.body.origClientName;
                var agentAbbrev = req.body.agentAbbrev;
                var clientPhone = req.body.clientPhone;
                var clientFax = req.body.clientFax;
                var clientAddress1 = new Object();
                var clientAddress2 = new Object();
                var clientAddress3 = new Object();
                var clientAddress4 = new Object();
                clientAddress1.addr = req.body.clientAddress1;
                clientAddress1.type = req.body.clientAddress1type;
                clientAddress2.addr = req.body.clientAddress2;
                clientAddress2.type = req.body.clientAddress2type;
                clientAddress3.addr = req.body.clientAddress3;
                clientAddress3.type = req.body.clientAddress3type;
                clientAddress4.addr = req.body.clientAddress4;
                clientAddress4.type = req.body.clientAddress4type;
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
                var clientStatus = req.body.clientStatus;

                // Set our collection
                var collection = db.get('Clients');


                // Submit to the DB
                collection.update(
                {
                    "clientName" : req.body.origClientName
                },
                {
                    $set: {
                        "clientName" : newClientName,
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
                        "modifiedBy" : username,
                        "lastModified" : currentDateTime,
                        "clientActive" : clientStatus
                    }
                }, function (err, doc) {
                    if (err) {
                        // If it failed, return error
                        next(err);
                    } else {
                        // And forward to success page
                        res.redirect('/home');
                    }
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* GET Contact for Search Contact Page. */
router.get('/search-contact', function(req, res) {

    // Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
                if (e) return callback(err);
                permissions = results;
                var ac = new AccessControl(permissions);
                const permission = ac.can(req.user.usertype).readAny('Contact');
                if (permission.granted) {
                    // Perform what is allowed when permission is granted
                    // Set our internal DB variable
                    var db = req.db;
                    var locals = {};
                    var tasks = [
                        // Load Clients
                        function(callback) {
                            var collection1 = db.get('Clients');

                            collection1.find({},{clientName : 1},function(e,clients){
                                if (e) return callback(err);
                                locals.clients = clients;
                                callback();
                            })
                        },
                        // Load Contacts
                        function(callback) {
                            var collection2 = db.get('Contacts');

                            collection2.find({},{contactFirstName : 1, contactLastName : 1},function(e,contacts){
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
                        res.render('search-contact', {
                            clientList : locals.clients,
                            contactList : locals.contacts,
                            user : req.user, permissions : results
                        });
                    });
                } else {
                    // resource is forbidden for this user/role
                    res.status(403).end();
                }
            });
    });

});

/* POST Query to MongoDB and return View Contact Page. */
router.post('/search-contact', function(req, res) {
    // Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
                if (e) return callback(err);
                permissions = results;
                var ac = new AccessControl(permissions);
                const permission = ac.can(req.user.usertype).readAny('Contact');
                if (permission.granted) {
                    // Perform what is allowed when permission is granted
                    // Set our internal DB variable
                    var result = {};
                    var db = req.db;
                    var contactName;
                    var clientName;
                    var tasks = [
                        // Load Contact information of contact searched
                        function(callback) {
                            var collection1 = db.get('Contacts');

                            collection1.find({ "_id" : req.body.contactID },{},function(e,contact){
                                if (e) return callback(err);
                                result.contact = contact;
                                clientName = result.contact[0].contactClientID;
                                contactName = result.contact[0].contactFirstName + ' ' + result.contact[0].contactLastName;
                                callback();
                            })
                        },
                        // Load Client associated with Contact searched
                        function(callback) {
                            var collection2 = db.get('Clients');
                            collection2.find({},{clientName : 1},function(e,clients){
                                if (e) return callback(err);
                                result.clients = clients;
                                callback();
                            });
                        }
                        ];

                    async.parallel(tasks, function(err) { //This function gets called after the two tasks have called their "task callbacks"
                        if (err) return next(err); //If an error occurred, let express handle it by calling the `next` function
                        // Here `locals` will be an object with `users` and `colors` keys
                        // Example: `locals = {users: [...], colors: [...]}`

                        // Load Events that match Client and Contact searched
                        var collection3 = db.get('Events');
                        collection3.find({$or:[{"contact1": contactName}, {"contact2": contactName}]},{sort: {'eventTimeIn._d' :-1} },function(e,events){
                            result.events = events;
                            db.close();
                            res.render('view-contact', {
                                "result": result,
                                contactID : req.body.contactID,
                                user : req.user,
                                permissions : permissions
                            });
                        });
                    });
                } else {
                    // resource is forbidden for this user/role
                    res.status(403).end();
                }
            });
    });
});

/* POST to Edit Contacts */
router.post('/viewContact', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).updateAny('Contact');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var db = req.db;
                // Get our form values. These rely on the "name" attributes
                var username = req.user.username;
                var contactID = req.body.contactID;
                var contactClientID = req.body.contactClientID;
                var contactFirstName = req.body.contactFirstName;
                var contactLastName = req.body.contactLastName;
                var contactPosition = req.body.contactPosition;
                var contactPhone = req.body.contactPhone;
                var contactMobile = req.body.contactMobile;
                var contactEmail = req.body.contactEmail;
                var contactNotes = req.body.contactNotes;
                var contactStatus = req.body.contactStatus;
                var currentDateTime = moment();
                // Set our collection
                var collection = db.get('Contacts');
                // Submit to the DB
                collection.update(
                {
                    "_id" : req.body.contactID
                },
                {
                    $set: {
                        "contactFirstName" : contactFirstName,
                        "contactLastName" : contactLastName,
                        "contactClientID" : contactClientID,
                        "contactPosition" : contactPosition,
                        "contactPhone" : contactPhone,
                        "contactMobile" : contactMobile,
                        "contactEmail" : contactEmail,
                        "contactNotes" : contactNotes,
                        "contactActive" : contactStatus,
                        "modifiedBy" : username,
                        "lastModified" : currentDateTime
                    }
                }, function (err, doc) {
                    if (err) {
                        // If it failed, return error
                        next(err);
                    } else {
                        // And forward to success page
                        res.redirect('/home');
                    }
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });});

/* GET Clients for Search Event Page. */
router.get('/search-event', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Event');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var db = req.db;

                var locals = {};
                locals.user = req.user.username;
                var tasks = [
                    // Load clients
                    function(callback) {
                        var collection = db.get('Clients');

                        collection.find({},{},function(e,clients){
                            if (e) return callback(err);
                            locals.clients = clients;
                            callback();
                        })
                    }
                    ];

                async.parallel(tasks, function(err) { //This function gets called after the two tasks have called their "task callbacks"
                    if (err) return next(err); //If an error occurred, let express handle it by calling the `next` function
                    // Here `locals` will be an object with `users` and `colors` keys
                    // Example: `locals = {users: [...], colors: [...]}`
                    db.close();
                    res.render('search-event', {
                        locals,
                        user : req.user, permissions : results
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* POST Query to MongoDB and return List Event Page. */
router.post('/search-event', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Event');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var result = {};
                var db = req.db;
                var dateStartInput = moment(req.body.dateStartInput.concat(' 00:00:00'), 'YYYY-MM-DD HH-mm-ss');
                var dateEndInput = moment(req.body.dateEndInput.concat(' 23:59:59'), 'YYYY-MM-DD HH-mm-ss');

                var tasks = [
                    // Load Events
                    function(callback) {
                        var collection1 = db.get('Events');
                        collection1.find( {
                            $and : [
                            { "clientName" : req.body.clientName },
                            { "eventTimeIn._d": { $gte: new Date(dateStartInput)} },
                            { "eventTimeIn._d": { $lte: new Date(dateEndInput)} }
                            ]
                        },{sort: {'eventTimeIn._d' :-1} },function(e,events){
                            if (e) return callback(err);
                            result.events = events;
                            callback();
                        });
                    }
                    ];

                async.parallel(tasks, function(err) { //This function gets called after the two tasks have called their "task callbacks"
                    if (err) return next(err); //If an error occurred, let express handle it by calling the `next` function
                    // Here `locals` will be an object with `users` and `colors` keys
                    // Example: `locals = {users: [...], colors: [...]}`
                    db.close();
                    res.render('list-event', {
                        "result": result,
                        clientName : req.body.clientName,
                        dateStartInput: req.body.dateStartInput,
                        dateEndInput: req.body.dateEndInput,
                        user : req.user, permissions : results
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* POST Query to MongoDB and return Edit Event Page. */
router.post('/list-event', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Event');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var db = req.db;
                var result = {};
                var tasks = [
                    // Load agents
                    function(callback) {
                        var collection1 = db.get('Agents');
                        collection1.find({},{},function(e,agents){
                            if (e) return callback(err);
                            result.agents = agents;
                            callback();
                        })
                    },
                    // Load clients
                    function(callback) {
                        var collection2 = db.get('Clients');
                        collection2.find({},{},function(e,clients){
                            if (e) return callback(err);
                            result.clients = clients;
                            callback();
                        })
                    },
                    // Load clientContacts
                    function(callback) {
                        var collection3 = db.get('Contacts');
                        collection3.find({},{},function(e,contacts){
                            if (e) return callback(err);
                            result.contacts = contacts;
                            callback();
                        })
                    },
                    // Load Event Details
                    function(callback) {
                        var collection4 = db.get('Events');
                        collection4.find({"_id": new ObjectID(req.body.submit)},{},function(e,events){
                            if (e) return callback(err);
                            result.events = events;
                            callback();
                        })
                    }
                    ];

                async.parallel(tasks, function(err) { //This function gets called after the two tasks have called their "task callbacks"
                    if (err) return next(err); //If an error occurred, let express handle it by calling the `next` function
                    // Here `locals` will be an object with `users` and `colors` keys
                    // Example: `locals = {users: [...], colors: [...]}`
                    db.close();
                    res.render('view-event', {
                        "result": result,
                        user : req.user, permissions : results,
                        eventID: req.body.submit,
                        clientName : req.body.clientName
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* POST to Edit Events */
router.post('/viewEvent', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).updateAny('Event');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var db = req.db;

                // Get our form values. These rely on the "name" attributes
                var eventID = req.body.eventID
                var clientName = req.body.eventClient;
                var agentAbbrev = req.body.eventAgent;
                var eventDate = req.body.eventDate;
                var eventDateTimeIn = moment(eventDate.concat(' ', req.body.eventTimeIn), 'YYYY-MM-DD HH-mm');
                var eventDateTimeOut = moment(eventDate.concat(' ', req.body.eventTimeOut), 'YYYY-MM-DD HH-mm');
                var eventDuration = parseInt(moment.duration(eventDateTimeOut.diff(eventDateTimeIn)).asMinutes());
                var eventType = req.body.eventType;
                var contact1 = req.body.eventContactID1;
                if (contact1 == "N/A"){
                    contact1 = "";
                }
                var contact2 = req.body.eventContactID2;
                if (contact2 == "N/A"){
                    contact2 = "";
                }
                var eventBranch = req.body.eventBranch;
                var eventRemarks = req.body.eventRemarks;
                var username = req.user.username;
                var currentDateTime = moment();

                // Set our collection
                var collection = db.get('Events');

                // Submit to the DB
                collection.update(
                {
                    "_id" : eventID
                },
                {
                    $set: {
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
                        "modifiedBy" : username,
                        "lastModified" : currentDateTime
                    }
                }, function (err, doc) {
                    if (err) {
                        // If it failed, return error
                        next(err);
                    } else {
                        // And forward to success page
                        res.redirect('/home');
                    }
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* POST to Add Clients */
router.post('/addClient', function(req, res, next) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).createAny('Client');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
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
                        next(err);
                    } else {
                        // And forward to success page
                        res.redirect('/home');
                    }
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* POST to Add Contacts */
router.post('/addContact', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).createAny('Contact');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
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
                        next(err);
                    } else {
                        // And forward to success page
                        res.redirect('/home');
                    }
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});


/* POST to Add Event */
router.post('/addEvent', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).createAny('Event');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
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
                if (contact1 == "N/A"){
                    contact1 = "";
                }
                var contact2 = req.body.contactID2;
                if (contact2 == "N/A"){
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
                        next(err);
                    } else {
                        // And forward to success page
                        res.redirect('/home');
                    }
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* GET list of Clients. */
router.get('/client-report', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Client');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var db = req.db;

                // Set our collection
                var collection = db.get('Clients');

                collection.find({},{},function(e,docs){
                    res.render('client-report', {
                        "clientList" : docs,
                        user : req.user, permissions : results
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* GET list of Contact. */
router.get('/contact-report', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Contact');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var db = req.db;

                // Set our collection
                var collection = db.get('Contacts');

                collection.find({},{},function(e,docs){
                    res.render('contact-report', {
                        "contactList" : docs,
                        user : req.user, permissions : results
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});


/* GET list of Users. */
router.get('/event-report', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Event');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var db = req.db;

                // Set our collection
                var collection = db.get('Events');

                collection.find({},{},function(e,docs){
                    res.render('event-report', {
                        "eventList" : docs,
                        user : req.user, permissions : results
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* GET Query to display list of users */
router.get('/view-users', function(req, res){
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Account');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var db = req.db;

                // Set our collection
                var collection = db.get('accounts');

                collection.find({},{},function(e,docs){
                    res.render('view-users', {
                        "users" : docs,
                        user : req.user, permissions : results
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* POST Query to MongoDB and return Edit User Page. */
router.post('/view-users', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Account');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var db = req.db;
                var collection = db.get('accounts');
                collection.find({"username":req.body.username},{},function(e,docs){
                    res.render('edit-users', {
                        "results" : docs,
                        user : req.user, permissions : results
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});


/* POST Query to MongoDB and Update Account Entry. */
router.post('/edit-user', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).updateAny('Account');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var db = req.db;
                var collection = db.get('accounts');
                var changePW;
                if (req.body.changePW == "on"){
                    changePW = true;
                } else {
                    changePW = false;
                }


                var userStatus;
                if (req.body.userStatus == 'Enabled'){
                    userStatus = true;
                } else if (req.body.userStatus = 'Disabled') {
                    userStatus = false;
                }


                collection.update({
                    "_id" : req.body.userID
                },
                {
                    $set: {
                        "username": req.body.userName,
                        "usertype": req.body.userRole,
                        "active": userStatus,
                        "changePwOnLogin": changePW
                    }
                }, function (err, doc) {
                    if (err) {
                        // If it failed, return error
                        next(err);
                    } else {
                        // And forward to success page
                        res.redirect('/home');
                    }
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* GET Query to display list of Permissions and Roles */
router.get('/edit-permissions', function(req, res){
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).readAny('Permissions');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var db = req.db;

                // Set our collection
                var collection = db.get('Permissions');

                collection.find({},{},function(e,docs){
                    res.render('edit-permissions', {
                        "getPermissions" : docs,
                        user : req.user,
                        permissions : results
                    });
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});


/* POST Query to MongoDB and return Edit User Page. */
router.post('/edit-permissions', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).updateAny('Permissions');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var db = req.db;
                var collection = db.get('Permissions');
                var roles = ['Administrator', 'Agent', 'ReadOnly'];
                var resources = ['Client', 'Contact', 'Event', 'Import', 'Permissions', 'Roles', 'Account'];
                var str = '';
                //repopulate every entry on table
                for (i in roles) {
                    for (k in resources) {
                        //Check action:Create
                        str = '';
                        str = str.concat(roles[i], '.', resources[k], '.Create');
                        if (req.body[str] == 'on'){
                            collection.findOneAndUpdate(
                            {  //filter
                                "role": roles[i],
                                "resource": resources[k],
                                "action": "Create:any",
                                "attributes": "*"
                            },
                            {   //update
                                $set: {"role": roles[i],
                                    "resource": resources[k],
                                    "action": "Create:any",
                                    "attributes": "*" }
                            },
                            {
                                upsert: true
                            })
                        } else {
                            collection.remove({
                                "role": roles[i],
                                "resource": resources[k],
                                "action": "Create:any"
                            })
                        }

                        //Check action:Read
                        str = '';
                        str = str.concat(roles[i], '.', resources[k], '.Read');
                        if (req.body[str] == 'on'){
                            collection.findOneAndUpdate(
                            {   //filter
                                "role": roles[i],
                                "resource": resources[k],
                                "action": "Read:any",
                                "attributes": "*"
                            },
                            {   //update
                                $set: {"role": roles[i],
                                "resource": resources[k],
                                "action": "Read:any",
                                "attributes": "*"}
                            },
                            {
                                    upsert: true
                            })
                        } else {
                            collection.remove({
                                "role": roles[i],
                                "resource": resources[k],
                                "action": "Read:any"
                            })
                        }

                        //Check action:Update
                        str = '';
                        str = str.concat(roles[i], '.', resources[k], '.Update');
                        if (req.body[str] == 'on'){
                            collection.findOneAndUpdate(
                            {   //filter
                                "role": roles[i],
                                "resource": resources[k],
                                "action": "Update:any",
                                "attributes": "*"
                            },
                            {   //update
                                $set: {"role": roles[i],
                                "resource": resources[k],
                                "action": "Update:any",
                                "attributes": "*"}
                            },
                            {
                                    upsert: true
                            })
                        } else {
                            collection.remove({
                                "role": roles[i],
                                "resource": resources[k],
                                "action": "Update:any"
                            })
                        }

                        //Check action:Delete
                        str = '';
                        str = str.concat(roles[i], '.', resources[k], '.Delete');
                        if (req.body[str] == 'on'){
                            collection.findOneAndUpdate(
                            {   //filter
                                "role": roles[i],
                                "resource": resources[k],
                                "action": "Delete:any",
                                "attributes": "*"
                            },
                            {   //update
                                $set: {"role": roles[i],
                                "resource": resources[k],
                                "action": "Delete:any",
                                "attributes": "*"}
                            },
                            {
                                    upsert: true
                            })
                        } else {
                            collection.remove({
                                "role": roles[i],
                                "resource": resources[k],
                                "action": "Delete:any"
                            })
                        }
                    }
                }
                res.redirect('/home');
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});


/* GET User Entry Form. */
router.get('/entry-user', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            const permission = ac.can(req.user.usertype).createAny('Account');
            if (permission.granted) {
                res.render('./entry-user', {
                    user : req.user, permissions : results
                });
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});

/* POST to Add Agents */
router.post('/addUser', function(req, res) {
// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var userType = ''
    var permissions = {};

    var collectionAccounts = db.get('accounts');
    var collectionPermissions = db.get('Permissions');

    collectionAccounts.find({"_id" : req.user._id},{fields : "usertype -_id"},function(e,usertype){
        if (e) return callback(err);
        userType = usertype[0].usertype;
        collectionPermissions.find({"role" : userType},{},function(e,results){
            if (e) return callback(err);
            permissions = results;
            var ac = new AccessControl(permissions);
            // TODO: Allow register of users on home page
            // TODO: Restirct access to entry-user
            // TODO: Figure out why there is 2 /adduser posts
            const permission = ac.can(req.user.usertype).readAny('Event');
            if (permission.granted) {
                // Perform what is allowed when permission is granted
                // Set our internal DB variable
                var db = req.db;

                // Get our form values. These rely on the "name" attributes
                var agentAbbrev = req.body.agentAbbrev;
                var newUserName = req.body.newUserName;
                var newUserType = req.body.newUserType;
                var username = req.user.username;
                var agentFirstName = req.body.agentFirstName;
                var agentLastName = req.body.agentLastName;
                var agentPosition = req.body.agentPosition;
                var agentPhone = req.body.agentPhone;
                var currentDateTime = moment();
                var defaultStatus = "Enabled";
                var newPassword = req.body.newPassword;
                var changePW

                if (req.body.changePW == "on"){
                    changePW = true;
                } else {
                    changePW = false;
                }

                if (newUserType == 'Administrator'){
                    Account.register(new Account({ username : newUserName, usertype : 'Administrator' , active : true, changePwOnLogin : changePW}), newPassword, function(err, account) {
                        if (err) {
                            console.log(err);
                            res.redirect('/home');
                        }
                    });

                } else if (newUserType == 'Read-Only') {
                    Account.register(new Account({ username : newUserName, usertype : 'ReadOnly', active : true, changePwOnLogin : changePW}), newPassword, function(err, account) {
                        if (err) {
                            console.log(err);
                            res.redirect('/home');
                        }
                    });

                } else if (newUserType == 'Agent'){

                    var tasks = [
                    // Create Agent object
                    function(callback) {
                        var collection1 = db.get('Agents');

                        collection1.insert({
                            "agentAbbrev" : agentAbbrev,
                            "agentFirstName" : agentFirstName,
                            "agentLastName" : agentLastName,
                            "agentPosition" : agentPosition,
                            "agentPhone" : agentPhone,
                            "createdBy" : username,
                            "createDate" : currentDateTime,
                            "agentActive" : defaultStatus
                        },{},function(e,doc){
                            if (e) console.log(e);
                            callback();
                        })
                    },
                    // Create Account
                    function(callback) {
                        Account.register(new Account({ username : newUserName, usertype : 'Agent', active : true, changePwOnLogin : changePW}), newPassword, function(err, account) {
                            if (err) {
                                console.log(err);
                                callback();
                            }
                        });
                    }
                    ];

                    async.parallel(tasks, function(err) { //This function gets called after the three tasks have called their "task callbacks"
                        if (err) return next(err); //If an error occurred, let express handle it by calling the `next` function
                        // Here `locals` will be an object with `users` and `colors` keys
                        // Example: `locals = {users: [...], colors: [...]}`
                        db.close();
                        res.redirect('/home');
                    });

                }
            } else {
                // resource is forbidden for this user/role
                res.status(403).end();
            }
        });
    });
});


module.exports = router;
