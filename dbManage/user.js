var mongoose = require('./db.js'),
    Schema = mongoose.Schema;

var UserSchema = new Schema({
    ID : { type: String },
    fullName : {type: String},
    email: {type:String}
});

module.exports =   mongoose.model('User',UserSchema);
