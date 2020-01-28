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
var db = monk('mongodb+srv://heroku-app:<password>@chansey-staging-qrkj1.mongodb.net/test?retryWrites=true&w=majority');


//Create Route
var indexRouter = require('./routes/index');
var loginRouter = require('./routes/login');
var registerRouter = require('./routes/register');
var homeRouter = require('./routes/home');

var entryClientRouter = require('./routes/entry-client');
var entryContactRouter = require('./routes/entry-contact');
var entryEventRouter = require('./routes/entry-event');
var entryAgentRouter = require('./routes/entry-agent');

var dataEntryRouter = require('./routes/data-entry');
var reportsRouter = require('./routes/reports');
var clientReportRouter = require('./routes/client-report');
var contactReportRouter = require('./routes/contact-report');
var eventReportRouter = require('./routes/event-report');
var agentReportRouter = require('./routes/agent-report');

var reportActivityRouter = require('./routes/report-activity');
var reportVisitCountRouter = require('./routes/report-visit-count');
var reportClientListRouter = require('./routes/report-client-list');
var reportContactHistoryRouter = require('./routes/report-contact-history');
var reportClientHistoryRouter = require('./routes/report-client-history');

var resultActivityReportRouter = require('./routes/result-activity-report');
var resultVisitCountReportRouter = require('./routes/result-visit-count-report');
var resultClientListReportRouter = require('./routes/result-client-list-report');
var resultContactHistoryReportRouter = require('./routes/result-contact-history-report');
var resultClientHistoryReportRouter = require('./routes/result-client-history-report');

var searchClientRouter = require('./routes/search-client');
var searchContactRouter = require('./routes/search-contact');
var searchEventRouter = require('./routes/search-event');
var listEventRouter = require('./routes/list-event');
var viewClientRouter = require('./routes/view-client');
var viewContactRouter = require('./routes/view-contact');
var viewEventRouter = require('./routes/view-event');

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

app.use('/entry-client', entryClientRouter);
app.use('/entry-contact', entryContactRouter);
app.use('/entry-event', entryEventRouter);
app.use('/entry-agent', entryAgentRouter);

app.use('/data-entry', dataEntryRouter);
app.use('/reports', reportsRouter);
app.use('/client-report', clientReportRouter);
app.use('/contact-report', contactReportRouter);
app.use('/event-report', eventReportRouter);
app.use('/agent-report', agentReportRouter);

app.use('/report-activity', reportActivityRouter);
app.use('/report-visit-count', reportVisitCountRouter);
app.use('/report-client-list', reportClientListRouter);
app.use('/report-client-history', reportClientHistoryRouter);
app.use('/report-contact-history', reportContactHistoryRouter);

app.use('/result-activity-report', resultActivityReportRouter);
app.use('/result-visit-count-report', resultVisitCountReportRouter);
app.use('/result-client-list-report', resultClientListReportRouter);
app.use('/result-contact-history-report', resultContactHistoryReportRouter);
app.use('/result-client-history-report', resultClientHistoryReportRouter);

app.use('/search-client', searchClientRouter);
app.use('/search-contact', searchContactRouter);
app.use('/search-event', searchEventRouter);
app.use('/list-event', listEventRouter);
app.use('/view-client', viewClientRouter);
app.use('/view-contact', viewContactRouter);
app.use('/view-event', viewEventRouter);


// passport config
var Account = require('./models/account');
passport.use(new LocalStrategy(Account.authenticate()));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

// mongoose
mongoose.connect("mongodb+srv://heroku-app:<password>@chansey-staging-qrkj1.mongodb.net/test?retryWrites=true&w=majority", { useNewUrlParser: true });

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
