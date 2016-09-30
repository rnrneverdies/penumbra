// local imports
var Location = require('./location.js');
var calculaPosition = require('./fEspenak.js');

// Eclipse
function Eclipse(data) {
    this.data = data;
    
    // init point locations
    this.data.path.forEach(function (point) {
        // fix data types
        ["clLat", "clLon"].forEach((x) => {
            if (typeof point[x] === 'string') {
                point[x] = parseCoordinates(point[x]);
            }
        });
        point.location = new Location(point.clLat, point.clLon);
    });
}

Eclipse.prototype.getCircumstances = function getCircumstances(options) {
    return calculaPosition(this.data.elements, options.lat, options.lon, options.alt || 30.0,
        options.timeOffset || 0.0, options.dtsFactor || 0);
}

Eclipse.prototype.findNearestLocation = function findNearestLocation(options) {
    var bestMatch = this.data.path[0];
    //console.log("INIT", bestMatch);
    //console.log(options);

    var userLocation = new Location(options.lat, options.lon);
    var dist = 0.0;
    this.data.path.forEach(function (point) {
        console.log(point);
        dist = point.location.distance(userLocation);
        var curr = bestMatch.location.distance(userLocation);
        //console.log(">>>>>", dist, curr);
        if (dist < curr) {
            bestMatch = point;
        }
    });

    //console.log(bestMatch);
    return bestMatch;
}

function parseCoordinates(coord) {
    var parts = coord.split(":"),
        parts2 = parts[1].split("."),
        sign = (parts2[1].endsWith("S") || parts2[1].endsWith("W")) ? -1 : 1;

    return sign * (parseFloat(parts[0]) +
        parseFloat(parts2[0]) / 60 +
        parseFloat(parts2[1].substring(0, parts2[1].length - 1)) / 3600);
}

// Exports
module.exports = Eclipse;