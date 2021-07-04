const express = require('express');
const session = require("express-session");
const cookieParser = require('cookie-parser');
const path = require('path');
const user = require('./routers/user');
const app = express();

// view engine setup
//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'pug');

app.use(session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
    cookie: {maxAge: 1000 * 60 * 60*24*30},
    rolling: true
}));




app.use(function (req, res, next) {
    let currPath = req.url;
    currPath = currPath && currPath.split('?')[0]; 
    if (currPath == "/login.html" || currPath == "/login.css" || currPath == "/login.js" || 
     currPath == "/user/doLogin"   ||  currPath == "/user/logout"
    ) {
        if(currPath == "/login.html" && req.session.sessionToken){
            if (req.session.sessionToken) {
                res.redirect(301, '/index.html');
                return; 
            }
        }
        next();
    } else {
        if (req.session.sessionToken) {
            // app.locals["userInfo"] = req.session.userInfo.username;
            next();
        } else {
         /*    res.writeHead(200, {"Content-Type": "text/plain"});
            res.end(`{"code":"403","reson":"Not authorized."}`); */
            if(currPath.endsWith(".html") || currPath === "" || currPath === "/"){
                console.log("not authorizeda , redirect to login.html"); 
                res.redirect(302, '/login.html?toUrl='+currPath);
            }else{
                res.send(""); 
            }
            
        }
    }
});


app.use(express.static(path.join(__dirname, 'public')));


//app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

app.use('/user', user);


// catch 404 and forward to error handler
/* app.use(function (req, res, next) {
    next(createError(404));
}); */

// error handler
/*app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});*/


module.exports = app;
