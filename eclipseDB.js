// local imports
var Eclipse = require('./eclipse.js');
var Bessel = require('./bessel.js');
var Location = require('./location.js');

// data imports
var data = require(__dirname + '/data/eclipses.json');
var eclipses = [];

// eclipseDB
function eclipseDB() {
    // initialize eclipses.
    data.forEach((eclipse) => {
        eclipses.push(new Eclipse(eclipse));    
    });
    console.log('Eclipse DB: ' + eclipses.length + ' eclipses loaded');
}

eclipseDB.prototype.getEclipseById = function getEclipseById(id) {
    var eData = data.find((e) => e.id === id);
    if (eData) {
        return new Eclipse(eData);
    }
    return null;
}

eclipseDB.prototype.findEclipse = function findEclipseByLocation(options) {
    var currentDistance = Number.MAX_VALUE;
    var currentEclipse = null;
    var userLocation = new Location(options.lat, options.lon);
    eclipses.forEach((eclipse) => {
        var nearKnownPoint = eclipse.findNearestLocation(options);
        var dist = Math.abs(userLocation.distance(nearKnownPoint.location));

        if (currentDistance > dist) {
            currentDistance = dist;
            currentEclipse = eclipse;
        }
    });

    if (currentEclipse) {
        var circum = currentEclipse.getCircumstances(options);
        if (circum.eventType === 'none') {
            return null;
        }
    }

    return currentEclipse;
}

eclipseDB.prototype.findEclipse2 = function findEclipse(options) {
    // TODO: temporary function, no search at all
    return new Bessel.Eclipse2(Bessel.e20260812);
}

// Exports

module.exports = new eclipseDB();