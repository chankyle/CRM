var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var bodyParser = require('body-parser');
//const mongoose = require("mongoose");
//let db = mongoose.connect('mongodb://localhost/ToTheMoonDB');


var monk = require('monk');
var db = monk('localhost:27017/CRM');

var indexRouter = require('./routes/index');
var homeRouter = require('./routes/home');
var dataEntryRouter = require('./routes/data-entry');
var clientEntryRouter = require('./routes/client-entry');
var contactEntryRouter = require('./routes/contact-entry');
var eventEntryRouter = require('./routes/event-entry');
var agentEntryRouter = require('./routes/agent-entry');
var reportsRouter = require('./routes/reports');
var clientReportRouter = require('./routes/client-report');
var contactReportRouter = require('./routes/contact-report');
var eventReportRouter = require('./routes/event-report');
var agentReportRouter = require('./routes/agent-report');



var app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Make our db accessible to our router
app.use(function(req,res,next){
    req.db = db;
    next();
});


//handle routers to various page
app.use('/', indexRouter);
app.use('/home', homeRouter);
app.use('/data-entry', dataEntryRouter);
app.use('/client-entry', clientEntryRouter);
app.use('/contact-entry', contactEntryRouter);
app.use('/event-entry', eventEntryRouter);
app.use('/agent-entry', agentEntryRouter);
app.use('/reports', reportsRouter);
app.use('/client-report', clientReportRouter);
app.use('/contact-report', contactReportRouter);
app.use('/event-report', eventReportRouter);
app.use('/agent-report', agentReportRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});


// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};


  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
