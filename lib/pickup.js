var https = require('https');
var qs = require('querystring');

var SANDBOX_API = 'wwwcie.ups.com';
var LIVE_API = 'onlinetools.ups.com';

var USE_JSON = true;

var Pickup = function (licenseId, userId, password) {
	this.licenseId = licenseId;
	this.userId = userId;
	this.password = password;

	this.sandbox = true;
};

//Use UPS sandbox
Pickup.prototype.useSandbox = function(bool) {
  	this.sandbox = (bool == true);
};

Pickup.prototype.setJsonResponse = function(bool) {
	USE_JSON = (bool == true);
};

//Make a Pickup request
Pickup.prototype.makeRequest = function(options, callback) {

	//set account credentials
	options['licenseId'] = this.licenseId;
	options['userId'] = this.userId;
	options['password'] = this.password;

  var requestData = buildRequestData(options);
	var content = requestData.body;

  return new Promise(function (resolve, reject) {
    var req = https.request({
      host: (this.sandbox) ? SANDBOX_API : LIVE_API,
      path: '/webservices/Pickup',
      method: 'POST',
      headers: {
        'Cookie': "cookie",
        'Content-Type': 'text/xml',
        'Content-Length': Buffer.byteLength(content)
      }
    });

    /* build the request data for pick up ship and write it to
      the request body
    */
    req.write(content);
    console.log(content)

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

    var response = "";
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
    response += '<PickupCreationRequest xmlns="http://www.ups.com/XMLSchema/XOLTWS/Pickup/v1.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
    response += "<common:Request>"
      response += "<common:RequestOption/>"
      response += "<common:TransactionReference>"
        response += "<common:CustomerContext>" + data.customerContext + "</common:CustomerContext>"
      response += "</common:TransactionReference>"
    response += "</common:Request>"

    response += "<Shipper>";
      if (!data.shipper.accountNumber) return { success: false, error: 'Missing Shipper Account' };
      response += "<Account>";
        response += "<AccountNumber>";
          response += data.shipper.accountNumber
        response += "</AccountNumber>"
        response += "<AccountCountryCode>";
          response += data.shipper.countryCode
        response += "</AccountCountryCode>"
      response += "</Account>"
    response += "</Shipper>";

		response += "<PickupDateInfo>";
      if (!data.pickupDateInfo) return { success: false, error: 'Missing PickupDateInfo' };
      response += "<CloseTime>";
        response += data.pickupDateInfo.closeTime || '2000'
      response += "</CloseTime>";
      response += "<ReadyTime>";
        response += data.pickupDateInfo.readyTime
      response += "</ReadyTime>";
      response += "<PickupDate>";
        response += data.pickupDateInfo.pickupDate
      response += "</PickupDate>";
    response += "</PickupDateInfo>";

    if (!data.address) return { success: false, error: 'Missing address' };
    response +=  buildAddress(data.address)

    response += "<PickupPiece>";
      if (!data.pickupPiece) return { success: false, error: 'Missing pickupPiece' };

      response += "<ServiceCode>";
      response += data.pickupPiece.serviceCode
      response += "</ServiceCode>";
      response += "<Quantity>";
      response += data.pickupPiece.quantity || '1'
      response += "</Quantity>";
      response += "<DestinationCountryCode>";
      response += data.pickupPiece.destinationCountryCode
      response += "</DestinationCountryCode>";
      response += "<ContainerCode>";
      response += data.pickupPiece.containerCode || '01'
      response += "</ContainerCode>";
    response += "</PickupPiece>";

    response += "<PaymentMethod>";
      response += data.paymentMethod || '00'
    response += "</PaymentMethod>";

    response += "</PickupCreationRequest>";
    response += "</envr:Body>";
    response += "</envr:Envelope>";
	
    return { success: true, body: response };

};

var buildAddress = function(val) {
	var response = "";
	
  response += "<PickupAddress>";

    response += "<CompanyName>";
    response += val.companyName;
    response += "</CompanyName>";

    response += "<ContactName>";
    response += val.name;
    response += "</ContactName>";

		response += "<AddressLine>";
		response += val.address1;
		response += "</AddressLine>";

		response += "<AddressLine>";
		response += val.address2 || '';
		response += "</AddressLine>";

		response += "<AddressLine>";
		response += val.address3 || '';
		response += "</AddressLine>";
		
		response += "<City>";
		response += val.city;
		response += "</City>";

		response += "<PostalCode>";
		response += val.zip;
    response += "</PostalCode>";
  
		response += "<ResidentialIndicator>";
		response += val.isResidentila ?  'Y' : 'N';
		response += "</ResidentialIndicator>";
		
		response += "<CountryCode>";
		response += val.country;
    response += "</CountryCode>";
    
    response += "<Phone>";
      response += "<Number>";
      response += val.phoneNumber;
      response += "</Number>";

      if (val.phoneExtension) {
        response += "<Extension>";
        response += val.phoneExtension;
        response += "</Extension>";
      }
    response += "</Phone>";

	response += "</PickupAddress>";
	
	return response;
}

module.exports = Pickup;
