// Dependencies
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var createError = require('http-errors');
var express = require('express');
var LocalStrategy = require('passport-local').Strategy;
var logger = require('morgan');
var mongoose = require('mongoose');
var monk = require('monk');
var passport = require('passport');
var path = require('path');


//Set database
var db = monk('localhost:27017/CRM');


//Create Route
var indexRouter = require('./routes/index');
var loginRouter = require('./routes/login');
var registerRouter = require('./routes/register');
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
var activityReportRouter = require('./routes/activity-report');
var visitCountReportRouter = require('./routes/visit-count-report');
var clientListReportRouter = require('./routes/client-list-report');
var clientHistoryReportRouter = require('./routes/client-history-report');
var contactHistoryReportRouter = require('./routes/contact-history-report');
var resultActivityReportRouter = require('./routes/result-activity-report');
var resultVisitCountReportRouter = require('./routes/result-visit-count-report');
var resultClientListReportRouter = require('./routes/result-client-list-report');
var resultContactHistoryReportRouter = require('./routes/result-contact-history-report');
var resultClientHistoryReportRouter = require('./routes/result-client-history-report');
var viewClientSearchRouter = require('./routes/view-client-search');
var viewContactSearchRouter = require('./routes/view-contact-search');
var viewEventSearchRouter = require('./routes/view-event-search');

var app = express();



// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('express-session')({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));


// Make our db accessible to our router
app.use(function(req,res,next){
    req.db = db;
    next();
});

//handle routers to various page
app.use('/', indexRouter);
app.use('/login', loginRouter);
app.use('/register', registerRouter);
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
app.use('/activity-report', activityReportRouter);
app.use('/visit-count-report', visitCountReportRouter);
app.use('/client-list-report', clientListReportRouter);
app.use('/client-history-report', clientHistoryReportRouter);
app.use('/contact-history-report', contactHistoryReportRouter);
app.use('/result-activity-report', resultActivityReportRouter);
app.use('/result-visit-count-report', resultVisitCountReportRouter);
app.use('/result-client-list-report', resultClientListReportRouter);
app.use('/result-contact-history-report', resultContactHistoryReportRouter);
app.use('/result-client-history-report', resultClientHistoryReportRouter);
app.use('/view-client-search', viewClientSearchRouter);
app.use('/view-contact-search', viewContactSearchRouter);
app.use('/view-event-search', viewEventSearchRouter);

// passport config
var Account = require('./models/account');
passport.use(new LocalStrategy(Account.authenticate()));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

// mongoose
mongoose.connect("mongodb://localhost:27017/CRM", { useNewUrlParser: true });

app.use(express.json());
app.use(express.urlencoded({ extended: false }));








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
	  res.render('error', {
	    message: err.message,
	    error: err
	});
});


module.exports = app;
