// penumbra.js
var http = require('http');
var fs = require('fs');
var express = require('express');
var mustache = require('mustache');
var compression = require('compression');
var app = express();

// local imports
var getIPLocation = require('./iplocation.js');
var eclipseDB = require('./eclipseDB.js');

app.use(compression())
app.use('/ss', express.static(__dirname + '/static/css'));
app.use('/js', express.static(__dirname + '/static/js'));
app.use('/img', express.static(__dirname + '/static/img'));

app.get('/', function (req, res) {

    var clientIpAddress = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
      
    getIPLocation(clientIpAddress, 2000).then(function (ipInfo) {
        if (ipInfo.loc) {
            // parseFloat of lat and lon
            var locParts = ipInfo.loc.split(",");
            var options = {
                lat: parseFloat(locParts[0]),
                lon: parseFloat(locParts[1])
            };
           
            // find the recommended eclipse at the given location
            var eclipse = eclipseDB.findEclipse(options);

            // prepare the new location url
            var newUrl = '/' + eclipse.data.id + '/' + locParts[0] + '/' + locParts[1];

            // map the query string properties
            var queryString = (['city', 'country', 'region']).map((prop) => {
                if (ipInfo[prop]) {
                    return prop +'=' + encodeURIComponent(ipInfo[prop]);
                }
            }).join('&');

            // add the query string if procced
            newUrl = newUrl + (queryString ? '?' + queryString : '');            

            // set the new location
            res.location(newUrl);

            // redirect to the parametrized url
            res.sendStatus(302); 
        } else {
            res.location('/getlocation');
            res.sendStatus(302); // redirected to the client side get location tool
        }       
    }).catch(function (err) {
        res.sendStatus(500).sent(err.toString());
    });
});

app.get('/getlocation', function(req, res) { 
    if (req.query.lat && req.query.lon) {
        // find the recommended eclipse at the given location
        var eclipse = eclipseDB.findEclipse({ lat: req.query.lat, lon: req.query.lon });

        // prepare the new location url
        var newUrl = '/' + eclipse.data.id + '/' + req.query.lat + '/' + req.query.lon;
        
        // set the new location
        res.location(newUrl);

        // redirect to the parametrized url
        res.sendStatus(302); 
        return;
    }

    doResponse(res, {}, '/static/getlocation.html');
});

app.get('/:eclipse/:lat/:lon', mainHandler);
app.get('/story/:eclipse/:lat/:lon', mainHandler);

function mainHandler(req, res) {
    var template = '/static/index.html';
    if (req.originalUrl.startsWith('/story')) {
        template = '/static/index.txt.html';
    }
    // make the user location string.
    var userLocationStr = (['city', 'region', 'country']).map((prop, key) => {
        if (req.query[prop]) {
            return req.query[prop];
        }
        return null;
    }).filter((i) => { return !!i }).join(', ');

    if (!userLocationStr) {
        userLocationStr = '' + parseFloat(req.params.lat).toFixed(3) + ',' + parseFloat(req.params.lon).toFixed(3)
    }

    // find the eclipse by id
    var eclipse = eclipseDB.getEclipseById(req.params.eclipse);

    // if the eclipse was not found
    if (!eclipse) {
        var errorView = {
            location: userLocationStr
        }
        doResponse(res, errorView, '/static/nothing.html');
        return;
    }    
    
    // calculate the eclipse local circumstances
    var circum = eclipse.getCircumstances({ lat: parseFloat(req.params.lat), lon: parseFloat(req.params.lon) });
    var nearLocation = eclipse.findNearestLocation({ lat: parseFloat(req.params.lat), lon: parseFloat(req.params.lon) });

    if (circum.eventType === "None") {
        var errorView = {
            location: userLocationStr
        } 
        doResponse(res, errorView, '/static/nothing.html');
        return;
    }

    // prepare the view
    var ratio = Math.abs(1 - circum.coverage.value);
    var moonrel = 1.0;
    if (circum.magnitude.value < 1.0) {
        moonrel = circum.magnitude.value
    }
    var startX = 180.0;
    var endX = -180.0;
    var midY = Math.floor(150 * Math.abs(1 - moonrel));

    if (req.params.lat < 0) {
        startX = -180.0;
        endX = 180.0;
    }

    if (req.params.lat < nearLocation.location.lat) {
        midY = midY * -1.0;
    } 

    // fixed view for fixed cases
    if (eclipse.data.type.toLowerCase() === 'annular' &&
        circum.eventType.toLowerCase() === 'annular' ||
        eclipse.data.type.toLowerCase() === 'total' &&
        circum.eventType.toLowerCase() === 'total') {
        midY = 0;
    }

    eclipse.data.circum = circum;
    
    var view = {
        eclipseUrl: req.originalUrl,
        userLocation: {
            title: req.query.city || '' + req.param.lat + ', ' + req.param.lon,
            details: req.query,
            complete: userLocationStr
        },
        recommendedEclipse: eclipse.data,            
        visual: {
            eclipseClass: eclipse.data.type.toLowerCase(), 
            bgColor: 'hsl(197, 71%, ' + (70.0 * ratio) + '%)',
            midX: '0px', startX: startX + 'px', endX: endX + 'px', 
            midY: midY + 'px', startY: midY + 'px', endY: midY + 'px',
            midX1: '0px', midY1: (-midY) + 'px', obsc: Math.pow(circum.coverage.value,2)
        }
    }

    doResponse(res, view, template);
}

function doResponse(res, view, template) {
    // read, render and send the template
    fs.readFile(__dirname + template, 'utf8', function (err, data) {
        if (err) {
            res.sendStatus(500).send(err.toString());
        }
        var output = mustache.render(data, view);
        res.send(output);
    });
}

module.exports = app
