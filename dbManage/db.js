const mongoose = require('mongoose');
const config = require("config-yml");
const Logger = require("../utils/Logger"); 
let   DB_URL = config.dbUrl + config.dbName;


mongoose.connect(DB_URL);

/**
 * 连接成功
 */
mongoose.connection.on('connected', function () {
    Logger.info('Mongoose connection open to ' + DB_URL);
});

/**
 * 连接异常
 */
mongoose.connection.on('error',function (err) {
    Logger.info('Mongoose connection error: ' + err);
});

/**
 * 连接断开
 */
mongoose.connection.on('disconnected', function () {
    Logger.info('Mongoose connection disconnected');
});

module.exports = mongoose;
