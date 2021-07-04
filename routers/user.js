const express = require('express');
const router = express.Router();
const Logger = require("../utils/Logger"); 
const userDb = require("../dbManage/operator")('user');
const {verifyGoogle,verifyMicrosft,verifyApple} = require("../utils/verify"); 

router.post('/doLogin', async function(req, res, next) {
    //console.log(`req = ${JSON.stringify(req.body)}`); 
    const params = req.body;
    try{
        const {platform,idToken} = params; 
        let ID = "",payload = null; 
        if(platform === "google"){
            payload =  await verifyGoogle(idToken); 
            console.log(`payload = ${JSON.stringify(payload)}`); 
            ID = payload.sub; 
        }else if(platform === 'microsoft'){
            payload = await verifyMicrosft(idToken); 
            console.log(`payload = ${JSON.stringify(payload)}`); 
            ID = payload.sub; 
        }else if(platform ==="apple"){   //apple will send req with code,It's different from other provider. 
            payload = await verifyApple(idToken); 
            payload.name = payload.email; 
            ID = payload.sub;
        }else{
            Logger.error("doLogin failed,unknow platform");
            res.send(`{"code":-1,"reson":"unknow platform"}`);
            return; 
        }
    
        const user = await userDb.findOnePromise({ID});
        let userName = payload.name;      
        if(!user){
            const data = { 
                ID : payload.sub,
                fullName : payload.name,
            }
            if(platform === "google"){
                data.email =  payload.email; 
            }else if(platform === "microsoft"){
                data.email =  payload.preferred_username;    
            }else if(platform === "apple"){
                data.email = payload.email; 
                data.fullName = payload.email; 
            }
            userDb.add(data); 
        }
        req.session.sessionToken = idToken;   
        res.send(`{"code":0,"userName":"${userName}"}`);
    }catch(e){
        res.send(`{"code":-1,"reson":"${e}"}`);
        Logger.error(`doLogin ${e}}`);    
        return; 
    }
})



router.post("/logout",function (req,res) {
    req.session.destroy(function (err) {
        if(err){
            res.send(`{"code":-1,"reson","${err}"}`);     
        }else{
            /* res.redirect("/login.html"); */
           res.send(`{"code":0}`);
        }
    });
});


module.exports = router;
