var http = require('http');

function getIPLocation(ipAddress, timeout) {
    var timeout = timeout || 1500;
    var promise = new Promise(
        function (resolve, reject) {
            // remove port from address 
            ipAddress = ipAddress.split(':')[0];

            // create the request
            var request = http.get('http://ipinfo.io/' + ipAddress, function (res) {
                var body = '';

                res.on('data', function (chunk) {
                    body += chunk;
                });

                res.on('end', function () {
                    var ipInfo = JSON.parse(body);
                    ipInfo.status = "success";

                    // resolve the promise
                    resolve(ipInfo);                  
                });
            }).on('error', function (e) {
                var ipInfo = { status: "error", city: "Unknown" };

                // resolve the promise
                resolve(ipInfo);      
            });

            // if no answer form the ip geo locaiton api, answer without that info. 
            request.setTimeout(timeout, function () {
                var ipInfo = { status: "timeout", city: "Unknown" };

                // resolve the promise
                resolve(ipInfo);
            });
        }
    );

    return promise;
}

module.exports = getIPLocation;
