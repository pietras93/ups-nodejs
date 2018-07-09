var https = require('https');
var qs = require('querystring');

var SANDBOX_API = 'wwwcie.ups.com';
var LIVE_API = 'onlinetools.ups.com';

var USE_JSON = true;

var CancelPickup = function (licenseId, userId, password) {
	this.licenseId = licenseId;
	this.userId = userId;
	this.password = password;

	this.sandbox = true;
};

//Use UPS sandbox
CancelPickup.prototype.useSandbox = function(bool) {
  	this.sandbox = (bool == true);
};

CancelPickup.prototype.setJsonResponse = function(bool) {
	USE_JSON = (bool == true);
};

//Make a shipAccept request
CancelPickup.prototype.makeRequest = function(options, callback) {

	//set account credentials
	options['licenseId'] = this.licenseId;
	options['userId'] = this.userId;
	options['password'] = this.password;

  var requestData = buildRequestData(options);
	var content = requestData.body;
	var sandbox = this.sandbox

  return new Promise(function (resolve, reject) {
    var req = https.request({
      host: sandbox ? SANDBOX_API : LIVE_API,
      path: '/webservices/Pickup',
      method: 'POST',
      headers: {
        'Cookie': "cookie",
        'Content-Type': 'text/xml',
        // 'Content-Length': Buffer.byteLength(content)
      }
    });

    /* build the request data for pick up ship and write it to
      the request body
    */
    req.write(content);

    req.on('response', function(res) {
    
      var responseData = '';
      var useJsonResponse = this.json;
        
      res.on('data', function(data) {
        data = data.toString();
        responseData += data;
      });

      res.on('end', function() {

        if (USE_JSON) {
          var parseString = require('xml2js').parseString;
          parseString(responseData, function (err, result) {
            if (err) {
              reject(err)
            } else {
              resolve(result);            
            }
          });
        } else {
          // xml reponse
          resolve(responseData);
        }
      });
    });

    req.end();
  })
};

function buildRequestData(data) {

	var response = "", err = false;

  response += '<envr:Envelope xmlns:envr="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:common="http://www.ups.com/XMLSchema/XOLTWS/Common/v1.0" xmlns:upss="http://www.ups.com/XMLSchema/XOLTWS/UPSS/v1.0">'
  response += "<envr:Header>"
    response += "<upss:UPSSecurity>"
      response += "<upss:UsernameToken>"
        response += "<upss:Username>" + data.userId + "</upss:Username>"
        response += "<upss:Password>" + data.password + "</upss:Password>"
      response += "</upss:UsernameToken>"
      response += "<upss:ServiceAccessToken>"
        response += "<upss:AccessLicenseNumber>" + data.licenseId + "</upss:AccessLicenseNumber>"
      response += "</upss:ServiceAccessToken>"
    response += "</upss:UPSSecurity>"
  response += "</envr:Header>"
  response += "<envr:Body>"
  response += '  <PickupCancelRequest xmlns="http://www.ups.com/XMLSchema/XOLTWS/Pickup/v1.1" xmlns:ups="http://www.ups.com/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
      response += "<common:Request>"
      response += "<common:TransactionReference>"
        response += "<common:CustomerContext>" + data.customerContext + "</common:CustomerContext>"
      response += "</common:TransactionReference>"
    response += "</common:Request>"
			
    response += "<CancelBy>";
    response += "02" // 02 - PRN
    response += "</CancelBy>";

    if (!data.PRN) return { success: false, error: 'Missing PRN' };
    response += "<PRN>";
    response += data.PRN
    response += "</PRN>";

    response += "</PickupCancelRequest>";
    response += "</envr:Body>";
    response += "</envr:Envelope>";

    return (err) ? {success: false, error: err } : { success: true, body: response };

};

module.exports = CancelPickup;
