window.onload   = () => {
    startApp(); 
    //Listen for authorization success
    document.addEventListener('AppleIDSignInOnSuccess', (data) => {
        //handle successful response
        console.log(`AppleIDSignInOnSuccess data = ${JSON.stringify(data)}`); 
    });
    //Listen for authorization failures
    document.addEventListener('AppleIDSignInOnFailure', (error) => {
        //handle error.
        //alert(`apple login err:${error}`)
    });
};    

const config = {
    microsoftRedirectUrl: "https://huangxing8.com:5566/",
    appleRedicretUrl: 'https://huangxing8.com:5566/user/doLogin',
}

function onUserSignIn(name){
    localStorage.setItem("userName",name); 
    window.location.href = "index.html"; 
    
}


function sendLoginRequest(idToken,platform){
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/user/doLogin');
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.onload = function() {
      console.log('Signed in as: ' + xhr.responseText);
      let result = JSON.parse(xhr.responseText); 
      if(result.code === 0){
          console.info(`${result.userName} sign in server return sucess`); 
          onUserSignIn(result.userName); 
      }else{
          alert("sign in error " + result.reson); 
      }
    };
    const data = {
        idToken,
        platform
    }
    xhr.send(JSON.stringify(data));
}

function googleSignOut() {
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function () {
      console.log('User signed out.');
    });
  }
function onGoogleSignIn(googleUser) {
  // Useful data for your client-side scripts:
/*   var profile = googleUser.getBasicProfile();
  console.log("ID: " + profile.getId()); // Don't send this directly to your server!
  console.log('Full Name: ' + profile.getName());
  console.log('Given Name: ' + profile.getGivenName());
  console.log('Family Name: ' + profile.getFamilyName());
  console.log("Image URL: " + profile.getImageUrl());
  console.log("Email: " + profile.getEmail()); */
  var idToken = googleUser.getAuthResponse().id_token;
  sendLoginRequest(idToken,"google");   
}

var googleUser = {};
var startApp = function() {
  gapi.load('auth2', function(){
    auth2 = gapi.auth2.init({
      client_id: '311051639457-3dinuotu3se5jo0qp5g8qo7pt1mo62gd.apps.googleusercontent.com',
      cookiepolicy: 'single_host_origin',
    });
    attachSignin(document.getElementById('googlemBtn'));
  });
};

function attachSignin(element) {
  console.log(element.id);
  auth2.attachClickHandler(element, {},
     onGoogleSignIn, function(error) {
        alert(JSON.stringify(error, undefined, 2));
      });
}




//Microsoft Login in section
const msalConfig = {
    auth: {
        clientId: "b5c36995-0882-43b1-a0ca-a1d8b7439a82",
        authority: "https://login.microsoftonline.com/consumers",
        redirectUri: config.microsoftRedirectUrl,
    },
    cache: {
        cacheLocation: "sessionStorage", // This configures where your cache will be stored
        storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) {	
                    return;	
                }	
                switch (level) {	
                    case msal.LogLevel.Error:	
                        console.error(message);	
                        return;	
                    case msal.LogLevel.Info:	
                        console.info(message);	
                        return;	
                    case msal.LogLevel.Verbose:	
                        console.debug(message);	
                        return;	
                    case msal.LogLevel.Warning:	
                        console.warn(message);	
                        return;	
                }
            }
        }
    }
};

// Add here the scopes that you would like the user to consent during sign-in
const loginRequest = {
    scopes: ["User.Read"]
};

// Add here the scopes to request when obtaining an access token for MS Graph API
const tokenRequest = {
    scopes: ["User.Read", "Mail.Read"],
    forceRefresh: false // Set this to "true" to skip a cached token and go to the server to get a new token
};

const myMSALObj = new msal.PublicClientApplication(msalConfig);

function microsfotCheckAccount() {
    /**
     * See here for more info on account retrieval: 
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-common/docs/Accounts.md
     */
    const currentAccounts = myMSALObj.getAllAccounts();
    if (currentAccounts === null) {
        console.log("No microsoft accounts logined.");
        return;
    } else if (currentAccounts.length > 1) {
        // Add choose account code here
        console.warn("Multiple accounts detected.");
    } else if (currentAccounts.length === 1) {
    }
}


function onMicrosftSignIn(resp) {
    if (resp !== null) {
        username = resp.account.username;
        console.log(`onMicrosftSignIn resp = ${JSON.stringify(resp)}`); 
        onUserSignIn(username); 
        sendLoginRequest(resp.idToken,"microsoft");   
    } else {
        microsfotCheckAccount();
    }
}

function microsoftSignin(){
    myMSALObj.loginPopup(loginRequest).then(onMicrosftSignIn).catch(error => {
        console.error(error);
    });
}

//for apple sign in 
AppleID.auth.init({
    clientId: 'com.huangxing8.edu',
    scope: 'name email',
    redirectURI: config.appleRedicretUrl,
    state : '[STATE]',
    nonce : '[NONCE]',
    usePopup : true,
});

async function appleSignIn(){
    try {
        const data = await AppleID.auth.signIn(); 
        //console.log(`aapleSignIn data = ${JSON.stringify(data)}`); 
        sendLoginRequest(data.authorization.id_token,"apple"); 
   } catch ( error ) {
       alert(`appleSignIn error ${JSON.stringify(error)}`); 
        //handle error.
   }
}
