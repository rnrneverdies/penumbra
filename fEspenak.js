// Solar Eclipse Circumstances Calculator
//
// This code is being released under the terms of the GNU General Public
// License (http://www.gnu.org/copyleft/gpl.html) with the request that if
// you do improve on it or use it in your own site, please let me know at 
// http://eclipsewise.com/main/contact.html
// Thank you.  - Fred Espenak
//
//http://www.eclipsewise.com/solar/index.html
//
/*
Solar Eclipse Circumstances Calculator
Version 1.0 by Bill Kramer and Fred Espenak - 2016 Apr 26.
(based on "Eclipse Calculator" by Deirdre O'Byrne and Stephen McCann - 2003)

Modified 2016 April for tabular display of local circumstances given
a list of cities. Cities are grouped by geographic regions.

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
*/

// ------------------------------- obsvconst contents
// Observer constants -
// (0) North Latitude (radians)
// (1) West Longitude (radians)
// (2) Altitude (metres)
// (3) West time zone (hours)
// (4) rho sin O'
// (5) rho cos O'
// (6) index into the elements array for the eclipse in question
//
// Note that correcting for refraction will involve creating a "virtual" altitude
// for each contact, and hence a different value of rho and O' for each contact!
//
var obsvconst = new Array();

// ------------------------------- mid contents
// Eclipse circumstances
//  (0) Event type (C1=-2, C2=-1, Mid=0, C3=1, C4=2)
//  (1) t
// -- time-only dependent circumstances (and their per-hour derivatives) follow --
//  (2) x
//  (3) y
//  (4) d
//  (5) sin d
//  (6) cos d
//  (7) mu
//  (8) l1
//  (9) l2
// (10) dx
// (11) dy
// (12) dd
// (13) dmu
// (14) dl1
// (15) dl2
// -- time and location dependent circumstances follow --
// (16) h
// (17) sin h
// (18) cos h
// (19) xi
// (20) eta
// (21) zeta
// (22) dxi
// (23) deta
// (24) u
// (25) v
// (26) a
// (27) b
// (28) l1'
// (29) l2'
// (30) n^2
// -- observational circumstances follow --
// (31) p
// (32) alt
// (33) q
// (34) v
// (35) azi
// (36) m (mid eclipse only) or limb correction applied (where available!)
// (37) magnitude (mid eclipse only)
// (38) moon/sun (mid eclipse only)
// (39) calculated local event type for a transparent earth (mid eclipse only)
//      (0 = none, 1 = partial, 2 = annular, 3 = total)
// (40) event visibility
//      (0 = above horizon, 1 = below horizon, 2 = sunrise, 3 = sunset, 4 = below horizon, disregard)
//
var cities = new Array();
var citiesRecordSize = 10;
var citiesAdded = 0;

var UT1enabled = false;
var DSTenabled = false;
var cityDoDST = true; // 1 if yes, 0 if no.

var month = new Array("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul",
    "Aug", "Sep", "Oct", "Nov", "Dec");

var c1 = new Array();
var c2 = new Array();
var mid = new Array();
var c3 = new Array();
var c4 = new Array();


var currenttimeperiod = "";
var loadedtimeperiods = new Array();

function init() {
    eclipseID = 0; //offset into el array for future version
}

//
// Populate the circumstances array with the time-only dependent circumstances (x, y, d, m, ...)
function timedependent(elements, circumstances) {
    var type, index, t, ans;

    t = circumstances[1]
    index = obsvconst[6]
    // Calculate x
    ans = elements[9 + index] * t + elements[8 + index]
    ans = ans * t + elements[7 + index]
    ans = ans * t + elements[6 + index]
    circumstances[2] = ans
    // Calculate dx
    ans = 3.0 * elements[9 + index] * t + 2.0 * elements[8 + index]
    ans = ans * t + elements[7 + index]
    circumstances[10] = ans
    // Calculate y
    ans = elements[13 + index] * t + elements[12 + index]
    ans = ans * t + elements[11 + index]
    ans = ans * t + elements[10 + index]
    circumstances[3] = ans
    // Calculate dy
    ans = 3.0 * elements[13 + index] * t + 2.0 * elements[12 + index]
    ans = ans * t + elements[11 + index]
    circumstances[11] = ans
    // Calculate d
    ans = elements[16 + index] * t + elements[15 + index]
    ans = ans * t + elements[14 + index]
    ans = ans * Math.PI / 180.0
    circumstances[4] = ans
    // sin d and cos d
    circumstances[5] = Math.sin(ans)
    circumstances[6] = Math.cos(ans)
    // Calculate dd
    ans = 2.0 * elements[16 + index] * t + elements[15 + index]
    ans = ans * Math.PI / 180.0
    circumstances[12] = ans
    // Calculate m
    ans = elements[19 + index] * t + elements[18 + index]
    ans = ans * t + elements[17 + index]
    if (ans >= 360.0) {
        ans = ans - 360.0
    }
    ans = ans * Math.PI / 180.0
    circumstances[7] = ans
    // Calculate dm
    ans = 2.0 * elements[19 + index] * t + elements[18 + index]
    ans = ans * Math.PI / 180.0
    circumstances[13] = ans
    // Calculate l1 and dl1
    type = circumstances[0]
    if ((type == -2) || (type == 0) || (type == 2)) {
        ans = elements[22 + index] * t + elements[21 + index]
        ans = ans * t + elements[20 + index]
        circumstances[8] = ans
        circumstances[14] = 2.0 * elements[22 + index] * t + elements[21 + index]
    }
    // Calculate l2 and dl2
    if ((type == -1) || (type == 0) || (type == 1)) {
        ans = elements[25 + index] * t + elements[24 + index]
        ans = ans * t + elements[23 + index]
        circumstances[9] = ans
        circumstances[15] = 2.0 * elements[25 + index] * t + elements[24 + index]
    }
    return circumstances
}

//
// Populate the circumstances array with the time and location dependent circumstances
function timelocdependent(elements, circumstances) {
    var ans, index, type

    timedependent(elements, circumstances)
    index = obsvconst[6]
    // Calculate h, sin h, cos h
    circumstances[16] = circumstances[7] - obsvconst[1] - (elements[index + 5] / 13713.44)
    circumstances[17] = Math.sin(circumstances[16])
    circumstances[18] = Math.cos(circumstances[16])
    // Calculate xi
    circumstances[19] = obsvconst[5] * circumstances[17]
    // Calculate eta
    circumstances[20] = obsvconst[4] * circumstances[6] - obsvconst[5] * circumstances[18] * circumstances[5]
    // Calculate zeta
    circumstances[21] = obsvconst[4] * circumstances[5] + obsvconst[5] * circumstances[18] * circumstances[6]
    // Calculate dxi
    circumstances[22] = circumstances[13] * obsvconst[5] * circumstances[18]
    // Calculate deta
    circumstances[23] = circumstances[13] * circumstances[19] * circumstances[5] - circumstances[21] * circumstances[12]
    // Calculate u
    circumstances[24] = circumstances[2] - circumstances[19]
    // Calculate v
    circumstances[25] = circumstances[3] - circumstances[20]
    // Calculate a
    circumstances[26] = circumstances[10] - circumstances[22]
    // Calculate b
    circumstances[27] = circumstances[11] - circumstances[23]
    // Calculate l1'
    type = circumstances[0]
    if ((type == -2) || (type == 0) || (type == 2)) {
        circumstances[28] = circumstances[8] - circumstances[21] * elements[26 + index]
    }
    // Calculate l2'
    if ((type == -1) || (type == 0) || (type == 1)) {
        circumstances[29] = circumstances[9] - circumstances[21] * elements[27 + index]
    }
    // Calculate n^2
    circumstances[30] = circumstances[26] * circumstances[26] + circumstances[27] * circumstances[27]
    return circumstances
}

//
// Iterate on C1 or C4
function c1c4iterate(elements, circumstances) {
    var sign, iter, tmp, n

    timelocdependent(elements, circumstances)
    if (circumstances[0] < 0) {
        sign = -1.0
    } else {
        sign = 1.0
    }
    tmp = 1.0
    iter = 0
    while (((tmp > 0.000001) || (tmp < -0.000001)) && (iter < 50)) {
        n = Math.sqrt(circumstances[30])
        tmp = circumstances[26] * circumstances[25] - circumstances[24] * circumstances[27]
        tmp = tmp / n / circumstances[28]
        tmp = sign * Math.sqrt(1.0 - tmp * tmp) * circumstances[28] / n
        tmp = (circumstances[24] * circumstances[26] + circumstances[25] * circumstances[27]) / circumstances[30] - tmp
        circumstances[1] = circumstances[1] - tmp
        timelocdependent(elements, circumstances)
        iter++
    }
    return circumstances
}

//
// Get C1 and C4 data
//   Entry conditions -
//   1. The mid array must be populated
//   2. The magnitude at mid eclipse must be > 0.0
function getc1c4(elements) {
    var tmp, n

    n = Math.sqrt(mid[30])
    tmp = mid[26] * mid[25] - mid[24] * mid[27]
    tmp = tmp / n / mid[28]
    tmp = Math.sqrt(1.0 - tmp * tmp) * mid[28] / n
    c1[0] = -2
    c4[0] = 2
    c1[1] = mid[1] - tmp
    c4[1] = mid[1] + tmp
    c1c4iterate(elements, c1)
    c1c4iterate(elements, c4)
}

//
// Iterate on C2 or C3
function c2c3iterate(elements, circumstances) {
    var sign, iter, tmp, n

    timelocdependent(elements, circumstances)
    if (circumstances[0] < 0) {
        sign = -1.0
    } else {
        sign = 1.0
    }
    if (mid[29] < 0.0) {
        sign = -sign
    }
    tmp = 1.0
    iter = 0
    while (((tmp > 0.000001) || (tmp < -0.000001)) && (iter < 50)) {
        n = Math.sqrt(circumstances[30])
        tmp = circumstances[26] * circumstances[25] - circumstances[24] * circumstances[27]
        tmp = tmp / n / circumstances[29]
        tmp = sign * Math.sqrt(1.0 - tmp * tmp) * circumstances[29] / n
        tmp = (circumstances[24] * circumstances[26] + circumstances[25] * circumstances[27]) / circumstances[30] - tmp
        circumstances[1] = circumstances[1] - tmp
        timelocdependent(elements, circumstances)
        iter++
    }
    return circumstances
}

//
// Get C2 and C3 data
//   Entry conditions -
//   1. The mid array must be populated
//   2. There must be either a total or annular eclipse at the location!
function getc2c3(elements) {
    var tmp, n

    n = Math.sqrt(mid[30])
    tmp = mid[26] * mid[25] - mid[24] * mid[27]
    tmp = tmp / n / mid[29]
    tmp = Math.sqrt(1.0 - tmp * tmp) * mid[29] / n
    c2[0] = -1
    c3[0] = 1
    if (mid[29] < 0.0) {
        c2[1] = mid[1] + tmp
        c3[1] = mid[1] - tmp
    } else {
        c2[1] = mid[1] - tmp
        c3[1] = mid[1] + tmp
    }
    c2c3iterate(elements, c2)
    c2c3iterate(elements, c3)
}

//
// Get the observational circumstances
function observational(circumstances) {
    var contacttype, coslat, sinlat

    // We are looking at an "external" contact UNLESS this is a total eclipse AND we are looking at
    // c2 or c3, in which case it is an INTERNAL contact! Note that if we are looking at mid eclipse,
    // then we may not have determined the type of eclipse (mid[39]) just yet!
    if (circumstances[0] == 0) {
        contacttype = 1.0
    } else {
        if ((mid[39] == 3) && ((circumstances[0] == -1) || (circumstances[0] == 1))) {
            contacttype = -1.0
        } else {
            contacttype = 1.0
        }
    }
    // Calculate p
    circumstances[31] = Math.atan2(contacttype * circumstances[24], contacttype * circumstances[25])
    // Calculate alt
    sinlat = Math.sin(obsvconst[0])
    coslat = Math.cos(obsvconst[0])
    circumstances[32] = Math.asin(circumstances[5] * sinlat + circumstances[6] * coslat * circumstances[18])
    // Calculate q
    circumstances[33] = Math.asin(coslat * circumstances[17] / Math.cos(circumstances[32]))
    if (circumstances[20] < 0.0) {
        circumstances[33] = Math.PI - circumstances[33]
    }
    // Calculate v
    circumstances[34] = circumstances[31] - circumstances[33]
    // Calculate azi
    circumstances[35] = Math.atan2(-1.0 * circumstances[17] * circumstances[6], circumstances[5] * coslat - circumstances[18] * sinlat * circumstances[6])
    // Calculate visibility
    if (circumstances[32] > -0.00524) {
        circumstances[40] = 0
    } else {
        circumstances[40] = 1
    }
}

//
// Get the observational circumstances for mid eclipse
function midobservational() {
    observational(mid)
    // Calculate m, magnitude and moon/sun
    mid[36] = Math.sqrt(mid[24] * mid[24] + mid[25] * mid[25])
    mid[37] = (mid[28] - mid[36]) / (mid[28] + mid[29])
    mid[38] = (mid[28] - mid[29]) / (mid[28] + mid[29])
}

//
// Calculate mid eclipse
function getmid(elements) {
    var iter, tmp

    mid[0] = 0
    mid[1] = 0.0
    iter = 0
    tmp = 1.0
    timelocdependent(elements, mid)
    while (((tmp > 0.000001) || (tmp < -0.000001)) && (iter < 50)) {
        tmp = (mid[24] * mid[26] + mid[25] * mid[27]) / mid[30]
        mid[1] = mid[1] - tmp
        iter++
        timelocdependent(elements, mid)
    }
}

//
// Calculate the time of sunrise or sunset
function getsunriset(elements, circumstances, riset) {
    var h0, diff, iter

    diff = 1.0
    iter = 0
    while ((diff > 0.00001) || (diff < -0.00001)) {
        iter++
        if (iter == 4) return
        h0 = Math.acos((Math.sin(-0.00524) - Math.sin(obsvconst[0]) * circumstances[5]) / Math.cos(obsvconst[0]) / circumstances[6])
        diff = (riset * h0 - circumstances[16]) / circumstances[13];
        while (diff >= 12.0) diff -= 24.0;
        while (diff <= -12.0) diff += 24.0;
        circumstances[1] += diff
        timelocdependent(elements, circumstances)
    }
}

//
// Calculate the time of sunrise
function getsunrise(elements, circumstances) {
    getsunriset(elements, circumstances, -1.0)
}

//
// Calculate the time of sunset
function getsunset(elements, circumstances) {
    getsunriset(elements, circumstances, 1.0)
}

//
// Copy a set of circumstances
function copycircumstances(circumstancesfrom, circumstancesto) {
    var i;

    for (i = 1; i < 41; i++) {
        circumstancesto[i] = circumstancesfrom[i];
    }
}

//
// Populate the c1, c2, mid, c3 and c4 arrays
function getall(elements) {
    var pattern

    getmid(elements)
    midobservational()
    if (mid[37] > 0.0) {
        getc1c4(elements)
        if ((mid[36] < mid[29]) || (mid[36] < -mid[29])) {
            getc2c3(elements)
            if (mid[29] < 0.0) {
                mid[39] = 3 // Total eclipse
            } else {
                mid[39] = 2 // Annular eclipse
            }
            observational(c1)
            observational(c2)
            observational(c3)
            observational(c4)
            c2[36] = 999.9
            c3[36] = 999.9
            // Calculate how much of the eclipse is above the horizon
            pattern = 0
            if (c1[40] == 0) { pattern += 10000 }
            if (c2[40] == 0) { pattern += 1000 }
            if (mid[40] == 0) { pattern += 100 }
            if (c3[40] == 0) { pattern += 10 }
            if (c4[40] == 0) { pattern += 1 }
            // Now, time to make sure that all my observational[39] and observational[40] are OK
            if (pattern == 11110) {
                getsunset(elements, c4)
                observational(c4)
                c4[40] = 3
            } else if (pattern == 11100) {
                getsunset(elements, c3)
                observational(c3)
                c3[40] = 3
                copycircumstances(c3, c4);
            } else if (pattern == 11000) {
                c3[40] = 4
                getsunset(elements, mid)
                midobservational()
                mid[40] = 3
                copycircumstances(mid, c4)
            } else if (pattern == 10000) {
                mid[39] = 1
                getsunset(elements, mid)
                midobservational()
                mid[40] = 3
                copycircumstances(mid, c4)
            } else if (pattern == 1111) {
                getsunrise(elements, c1)
                observational(c1)
                c1[40] = 2
            } else if (pattern == 111) {
                getsunrise(elements, c2)
                observational(c2)
                c2[40] = 2
                copycircumstances(c2, c1)
            } else if (pattern == 11) {
                c2[40] = 4
                getsunrise(elements, mid)
                midobservational()
                mid[40] = 2
                copycircumstances(mid, c1)
            } else if (pattern == 1) {
                mid[39] = 1
                getsunrise(elements, mid)
                midobservational()
                mid[40] = 2
                copycircumstances(mid, c1)
            } else if (pattern == 0) {
                mid[39] = 0
            }
            // There are other patterns, but those are the only ones we're covering!
        } else {
            mid[39] = 1 // Partial eclipse
            pattern = 0
            observational(c1)
            observational(c4)
            if (c1[40] == 0) { pattern += 100 }
            if (mid[40] == 0) { pattern += 10 }
            if (c4[40] == 0) { pattern += 1 }
            if (pattern == 110) {
                getsunset(elements, c4)
                observational(c4)
                c4[40] = 3
            } else if (pattern == 100) {
                getsunset(elements, mid)
                midobservational()
                mid[40] = 3
                copycircumstances(mid, c4)
            } else if (pattern == 11) {
                getsunrise(elements, c1)
                observational(c1)
                c1[40] = 2
            } else if (pattern == 1) {
                getsunrise(elements, mid)
                midobservational()
                mid[40] = 2
                copycircumstances(mid, c1)
            } else if (pattern == 0) {
                mid[39] = 0
            }
            // There are other patterns, but those are the only ones we're covering!
        }
    } else {
        mid[39] = 0 // No eclipse
    }
    // Magnitude for total and annular eclipse is moon/sun ratio
    if ((mid[39] == 2) || (mid[39] == 3)) {
        mid[37] = mid[38]
    }
}

//
// Get the local date of an event
function getdate(elements, circumstances) {
    var t, ans, jd, a, b, c, d, e, index

    index = obsvconst[6]
    // Calculate the JD for noon (TDT) the day before the day that contains T0
    jd = Math.floor(elements[index] - (elements[1 + index] / 24.0))
    // Calculate the local time (ie the offset in hours since midnight TDT on the day containing T0).
    t = circumstances[1] + elements[1 + index] - obsvconst[3] - (elements[4 + index] - 0.5) / 3600.0
    if (t < 0.0) {
        jd--;
    }
    if (t >= 24.0) {
        jd++;
    }
    if (jd >= 2299160.0) {
        a = Math.floor((jd - 1867216.25) / 36524.25)
        a = jd + 1 + a - Math.floor(a / 4);
    } else {
        a = jd;
    }
    b = a + 1525.0
    c = Math.floor((b - 122.1) / 365.25)
    d = Math.floor(365.25 * c)
    e = Math.floor((b - d) / 30.6001)
    d = b - d - Math.floor(30.6001 * e)
    if (e < 13.5) {
        e = e - 1
    } else {
        e = e - 13
    }
    if (e > 2.5) {
        ans = c - 4716 + "-"
    } else {
        ans = c - 4715 + "-"
    }
    ans += month[e - 1] + "-"
    if (d < 10) {
        ans = ans + "0"
    }
    ans = ans + d
    return ans
}

//
// Get the local time of an event
function gettime(elements, circumstances) {
    var t, ans, index
    
    ans = ""
    index = obsvconst[6]
    t = circumstances[1] + elements[1 + index] - obsvconst[3] - (elements[4 + index] - 0.5) / 3600.0
    if (t < 0.0) {
        t = t + 24.0
    }
    if (t >= 24.0) {
        t = t - 24.0
    }

    var hour = Math.floor(t);
    var min = t = (t * 60.0) - 60.0 * Math.floor(t)
    var seg = 0;
    
    if (circumstances[40] <= 1) { // not sunrise or sunset
        seg = t = (t * 60.0) - 60.0 * Math.floor(t)        
    }
    var dateTime = new Date(Date.UTC(elements[28], elements[29] - 1, elements[30], hour, min, seg));
    var extra = "";
    if (circumstances[40] == 1) {
        extra = "";
    } else if (circumstances[40] == 2) {
        extra = "sunrise";
    } else if (circumstances[40] == 3) {
        extra = "sunset";
    } else {
        extra = "";
    }

    return {
        dateTime: dateTime,
        timestamp: dateTime.getTime(),
        utcString: formatUTCHour(dateTime),
        extra: extra
    };
}

function formatUTCHour(date) {
    return ('0' + date.getUTCHours()).slice(-2) + ':' +
        ('0' + date.getUTCMinutes()).slice(-2) + ':' +
        ('0' + date.getUTCSeconds()).slice(-2);
}

//
// Get the altitude
function getalt(circumstances) {
    var t, ans, result = { extra: "" }

    if (circumstances[40] == 2) {
        result.extra = 'sunrise';
    }
    if (circumstances[40] == 3) {
        result.extra = 'sunset';
    }
    if ((circumstances[32] < 0.0) && (circumstances[32] >= -0.00524)) {
        // Crude correction for refraction (and for consistency's sake)
        t = 0.0
    } else {
        t = circumstances[32] * 180.0 / Math.PI
    }
    if (t < 0.0) {
        t = -t
    }
    t = Math.floor(t + 0.5)
    result.value = t
    if (circumstances[40] == 1) {
        result.extra = "x";
    }
    return result;
}

//
// Get the azimuth
function getazi(circumstances) {
    var t, ans, result = { extra: "" }

    t = circumstances[35] * 180.0 / Math.PI
    if (t < 0.0) {
        t = t + 360.0
    }
    if (t >= 360.0) {
        t = t - 360.0
    }
    t = Math.floor(t + 0.5)
    result.value = t
    if (circumstances[40] == 1) {
        result.extra = "x"
    }
}
//
// Get the duration in mm:ss.s format
//
// Adapted from code written by Stephen McCann - 27/04/2001
function getduration() {
    var tmp, ans;

    if (c3[40] == 4) {
        tmp = mid[1] - c2[1]
    } else if (c2[40] == 4) {
        tmp = c3[1] - mid[1]
    } else {
        tmp = c3[1] - c2[1];
    }
    if (tmp < 0.0) {
        tmp = tmp + 24.0
    } else if (tmp >= 24.0) {
        tmp = tmp - 24.0
    }
    tmp = (tmp * 60.0) - 60.0 * Math.floor(tmp) + 0.05 / 60.0;
    ans = Math.floor(tmp) + "m"
    tmp = (tmp * 60.0) - 60.0 * Math.floor(tmp)
    if (tmp < 10.0) {
        ans = ans + "0"
    }
    ans += Math.floor(tmp) + "s"
    return ans
}

//
// Get the magnitude
function getmagnitude() {
    var result = { extra: "" }

    result.value = Math.floor(1000.0 * mid[37] + 0.5) / 1000.0
    if (mid[40] == 1) {
        result.extra = "x";
    }
    if (mid[40] == 2) {
        result.extra + "sunrise"
    }
    if (mid[40] == 3) {
        result.extra + "sunset"
    }
    result.percent = toPercent(result.value);
    return result;
}

//
// Get the coverage
function getcoverage() {
    var a, b, c, result = {}

    if (mid[37] <= 0.0) {
        a = "0.0"
    } else if (mid[37] >= 1.0) {
        a = "1.000"
    } else {
        if (mid[39] == 2) {
            c = mid[38] * mid[38]
        } else {
            c = Math.acos((mid[28] * mid[28] + mid[29] * mid[29] - 2.0 * mid[36] * mid[36]) / (mid[28] * mid[28] - mid[29] * mid[29]))
            b = Math.acos((mid[28] * mid[29] + mid[36] * mid[36]) / mid[36] / (mid[28] + mid[29]))
            a = Math.PI - b - c
            c = ((mid[38] * mid[38] * a + b) - mid[38] * Math.sin(c)) / Math.PI
        }
        a = Math.floor(1000.0 * c + 0.5) / 1000.0
    }
    if (mid[40] == 1) {
        result.extra = "x";
    }
    if (mid[40] == 2) {
        result.extra = "sunrise"
    }
    if (mid[40] == 3) {
        result.extra = "sunset"
    }
    result.percent = toPercent(a);
    result.value = a;
    return result;
}

function toPercent(v) {
    v = v * 100;
    return v.toFixed(1) + "%";
}

//
// City format - Each record contains the following details
//  0 Name
//  1 Hemisphere flag, 0 N, 1 S
//  2 Latitude degrees
//  3 Latitude minutes
//  4 Latitude seconds
//  5 Hemisphere flag, 
//  6 Longitude degrees
//  7 Longitude minutes
//  8 Longitude seconds
//  9 Timezone correction
//
// Main call back function to create the table of results. Table element is placed inside a tagged
// division, regenerated dynamically by the browser. This function calculates eclipse circumstances
// for each city in cList. 
//
function calculateCities(el, lat, lon, alt, timeOff, dtsFactor) {
    var output = {};
    output.eventType = "None";
    // Populate Observer data
    PopulateObsConst(lat, lon, alt, timeOff, dtsFactor);
    // Local circumstances calculated and stored in el and mid arrays
    getall(el);
    // Is there an event...
    if (mid[39] > 0) {

        // Type of event for location
        if (mid[39] == 1) {
            output.eventType = "Partial";
        } else if (mid[39] == 2) {
            output.eventType = "Annular";
        } else {
            output.eventType = "Total";
        }

        // Partial eclipse start
        if (c1[40] == 4) {
            output.partialEclipseStartTime = { timestamp: 0 };
            output.partialEclipseStartSunAlt = "-";           
        } else {
            output.partialEclipseStartTime = gettime(el, c1);
            output.partialEclipseStartSunAlt = getalt(c1);
        }

        // Central eclipse time
        if ((mid[39] > 1) && (c2[40] != 4)) {
            output.centralEclipseStartTime = gettime(el, c2);
            output.isTotal = true;
        } else {
            output.centralEclipseStartTime = { timestamp: 0 };
        }

        // Maximum eclipse time
        output.maximunEclipseTime = gettime(el, mid);
        
        // Maximum eclipse alt
        output.maximunEclipseAlt = getalt(mid);
        
        // Maximum eclipse azi
        output.maximunEclipseAzi = getazi(mid);

        // Central eclipse ends
        if ((mid[39] > 1) && (c3[40] != 4)) {
            output.centralEclipseEndTime = gettime(el, c3);
            output.isTotal = true;
        } else {
            output.centralEclipseEndTime = { timestamp: 0 };
        }
        
        // Partial eclipse ends
        if (c4[40] == 4) {
            output.partialEclipseEndTime = { timestamp: 0 };
            output.partialEclipseEndSunAlt = "-";
        } else {
            // Partial eclipse ends
            output.partialEclipseEndTime = gettime(el, c4);
            output.partialEclipseEndSunAlt = getalt(c4);
        }

        // Eclipse duration
        output.centralEclipseDuration = { 
            seconds: (output.centralEclipseEndTime.timestamp - output.centralEclipseStartTime.timestamp) / 1000.0            
        };
        output.centralEclipseDuration.utcString = formatUTCDuration(output.centralEclipseDuration.seconds);

        output.partialEclipseDuration = {
            seconds: (output.partialEclipseEndTime.timestamp - output.partialEclipseStartTime.timestamp) / 1000.0
        };
        output.partialEclipseDuration.utcString = formatUTCDuration(output.partialEclipseDuration.seconds);

        // Eclipse magnitude
        output.magnitude = getmagnitude();
       
        // Coverage
        output.coverage = getcoverage();
        
        // Central duration
        if (mid[39] > 1) {
            output.centralDuration = getduration();            
        } else {
            output.centralDuration = "-"
        }        
    } 

    return output;
}

function formatUTCDuration(s) {
    var d = Number(s);
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);
    return ((h > 0 ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (s < 10 ? "0" : "") + s);
}

// Put data from city list into observer constants used in computations
// Observer constants -
// (0) North Latitude (radians)
// (1) West Longitude (radians)
// (2) Altitude (metres)
// (3) West time zone (hours)
// (4) rho sin O'
// (5) rho cos O'
// (6) index into the elements array for the eclipse in question
function PopulateObsConst(lat, lon, alt, timeOff, dtsFactor) {
    // default value
    dtsFactor = dtsFactor || 0;

    // Get the latitude
    obsvconst[0] = lat;
    obsvconst[0] = obsvconst[0] * Math.PI / 180.0;

    // Get the longitude
    obsvconst[1] = lon * -1.0;
    obsvconst[1] = obsvconst[1] * Math.PI / 180.0;

    // Get the altitude
    obsvconst[2] = alt;

    //
    // Time zone correction
    //
    if (!UT1enabled) {
        obsvconst[3] = timeOff * -1.0; //time zone offset
        if (DSTenabled) obsvconst[3] = obsvconst[3] - dtsFactor; //DST factor
    } else {
        obsvconst[3] = 0.0; //UT1, no offset
    }
    cityDoDST = (dtsFactor == 1); // 1 if true, 0 if ignored
    //
    // Get the observer's geocentric position
    tmp = Math.atan(0.99664719 * Math.tan(obsvconst[0]))
    obsvconst[4] = 0.99664719 * Math.sin(tmp) + (obsvconst[2] / 6378140.0) * Math.sin(obsvconst[0])
    obsvconst[5] = Math.cos(tmp) + (obsvconst[2] / 6378140.0 * Math.cos(obsvconst[0]))

    obsvconst[6] = 0; //eclipse ID/offset in el
    //
}

module.exports = calculateCities;
