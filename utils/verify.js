const {OAuth2Client} = require('google-auth-library');
const config = require('config-yml');
const jwt_decode = require("jwt-decode"); 
const jwt = require('jsonwebtoken');
const fs = require('fs')
const axios = require('axios')
const querystring = require('querystring')

let   Google_CLIENT_ID = config.CLIENT_ID.google; 
const gOauthclient = new OAuth2Client(Google_CLIENT_ID);

async function verifyGoogle(token) {
/*   const ticket = await gOauthclient.verifyIdToken({
      idToken: token,
      audience: Google_CLIENT_ID, 
  });
  const payload = ticket.getPayload(); */
  let decoded = jwt_decode(token);
  return decoded; 
}

async function verifyMicrosft(token) {
  let decoded = jwt_decode(token);
  if(decoded.aud !== config.CLIENT_ID.microsoft){
    throw('incomparable aud !'); 
  }
  return decoded; 
}

const getClientSecret = () => {
	// sign with RSA SHA256
	const privateKey = fs.readFileSync("./certs/AuthKey_RRUNRUX567.p8");
	const headers = {
		kid: 'ZSM8VX7YM7',
		typ: undefined // is there another way to remove type?
	}
	const claims = {
		'iss': 'ZSM8VX7YM7',
		'aud': 'https://appleid.apple.com',
		'sub': 'com.huangxing8.edu',
	}

	token = jwt.sign(claims, privateKey, {
		algorithm: 'ES256',
		header: headers,
		expiresIn: '24h'
	});

	return token
}

async function verifyApple(token){
  let decoded = jwt_decode(token);
  //console.log(`verifyApple decoded = ${JSON.stringify(decoded)}`); 
  if(decoded.aud !== config.CLIENT_ID.apple){
    throw('incomparable aud !'); 
  }
  return decoded; 
/*   const clientSecret = getClientSecret()
	const requestBody = {
		grant_type: 'authorization_code',
		code,
		redirect_uri: 'https://huangxing8.com:5566/user/doLogin',
		client_id: 'com.huangxing8.edu',
		client_secret: clientSecret,
		scope: 'name email'
	}

  let response =  await axios.request({
		method: "POST",
		url: "https://appleid.apple.com/auth/token",
		data: querystring.stringify(requestBody),
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }); 
  console.log(`response = ${JSON.stringify(response)}`);  */
}



module.exports = {
  verifyGoogle,
  verifyMicrosft,
  verifyApple,
}
