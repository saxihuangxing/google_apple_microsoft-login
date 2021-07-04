const User = require("./user.js");
const Logger = require("../utils/Logger");

class DbOperator {

    add(params) {
        console.log("dbadd:" + JSON.stringify(params) + "  contruct = " + this.Module.constructor);
        var module = new this.Module(params);
        module.save(function (err, res) {
            if (err) {
                Logger.info("DbOperator add Error:" + err);
            } else {
                //console.log("Res:" + res);
            }
        });
    }




    find(query, opt, callback) {
        if (opt != null || opt != undefined) {
            this.Module.find(query, opt, callback);
        } else {
            this.Module.find(query, callback);
        }
    }


    findLimiteFiledsPromise(query,projection) {
        return new Promise((resolve, reject) => {
            this.Module.find(query,projection, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });
    }



    findPromise(query) {
        return new Promise((resolve, reject) => {
            this.Module.find(query, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });
    }

    findOnePromise(query) {
        return new Promise((resolve, reject) => {
            this.Module.findOne(query, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });
    }



    remove(query) {
        this.Module.remove(query, function (err, res) {
            if (err) {
                Logger.error(`db remove ${JSON.stringify(err)}`);
            } else {
                //console.log("Res:" + res);
            }
        });
    }




    count(query) {
        return new Promise((resolve, reject) => {
            this.Module.count(query, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });
    }
}

module.exports = (moduleType) => {
    let dbOperator = new DbOperator();
    switch (moduleType) {
        case 'user':
            dbOperator.Module = User;
            break;
        default:
            dbOperator.Module = User;
            break;
    }
    return dbOperator;
};
