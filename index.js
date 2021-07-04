const http = require('http');
const https = require('https');
const fs = require('fs');
const app = require('./app');
const config = require('config-yml');
const Logger = require('./utils/Logger');
const port = config.Port; 

app.set('port', port);

var key = fs.readFileSync(__dirname + '/certs/huangxing8.key');
var cert = fs.readFileSync(__dirname + '/certs/huangxing8.crt');
var options = {
  key: key,
  cert: cert
};

const server = https.createServer(options,app);
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            Logger.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            Logger.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}



function onListening() {
    Logger.info('start Listening on ' + port);
}

function uncaughtExceptionHandler(err){
    Logger.log("uncaughtExceptionHandler " + err);
    if(err && err.code == 'ECONNREFUSED'){
        //do someting
    }else{
       process.exit(1);
    }
}
process.on('uncaughtException', uncaughtExceptionHandler);




