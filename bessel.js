
var e20160226 = {
    t0: 15.00, At: 68.4, // TBD
    x0: 0.175935, x1: 0.525355, x2: -6.226e-06, x3: -7.415e-06,
    y0: -0.425555, y1: 0.153254, y2: 7.921e-05, y3: -2.077e-06,
    d0: -8.491654, d1: 0.015261, d2: 1.617e-06, d3: 0.0,
    l10: 0.552489, l11: -0.000126, l12: -1.152e-05, l13: 0.0,
    l20: 0.006300, l21: -0.000125, l22: -1.146e-05, l23: 0.0,
    u0: 41.798950, u1: 15.003085, u2: 1.914e-06, u3: 0.0,
    tanf1: 0.004722, tanf2: 0.004698
}

var e20260812 = {
    t0: 18.00, At: 72.0,
    x0: 0.475510, x1: 0.518923, x2: -7.727e-05, x3: -8.039e-06,
    y0: 0.771185, y1: -0.230167, y2: -1.246e-04, y3: 3.767e-06,
    d0: 14.796683, d1: -0.012065, d2: -3.098e-06, d3: 0.0,
    l10: 0.537974, l11: 0.000094, l12: -1.212e-05, l13: 0.0,
    l20: -0.008142, l21: 0.000093, l22: -1.206e-05, l23: 0.0,
    u0: 88.747810, u1: 15.003090, u2: 1.764e-06, u3: 0.0,
    tanf1: 0.004614,  tanf2: 0.004591
}

function Eclipse2(elements) {
    this.elements = elements;
    this.e = 0.0818192;

}

Eclipse2.prototype.toWGS84 = function (deg) {
    var d = Math.floor(deg);
    var minfloat = (deg - d) * 60;
    return ("" + d + ":" + minfloat.toFixed(3));
}

Eclipse2.prototype.toDMS = function (deg) {
    var d = Math.floor(deg);
    var minfloat = (deg - d) * 60;
    var m = Math.floor(minfloat);
    var secfloat = (minfloat - m) * 60;
    var s = Math.round(secfloat);
    // After rounding, the seconds might become 60. These two
    // if-tests are not necessary if no rounding is done.
    if (s == 60) {
        m++;
        s = 0;
    }
    if (m == 60) {
        d++;
        m = 0;
    }
    return ("" + d + ":" + m + ":" + s.toFixed(3));
}

Eclipse2.prototype.calc = function (t1) {
    var el = this.elements,
        t = t1 - el.t0 + el.At/3600.0,
        t2 = t * t,
        t3 = t * t * t,
        e = this.e,
        e2 = e * e,
        e4 = e * e * e * e;

    // calculate the circumstances at the given time.
    var c = {
        t: t, t1: t1, t2: t2, t3: t3,
        x: el.x0 + el.x1 * t + el.x2 * t2 + el.x3 * t3,
        y: el.y0 + el.y1 * t + el.y2 * t2 + el.y3 * t3,
        d: el.d0 + el.d1 * t + el.d2 * t2 + el.d3 * t3,
        u: el.u0 + el.u1 * t + el.u2 * t2 + el.u3 * t3,
        l1: el.l10 + el.l11 * t + el.l12 * t2,
        l2: el.l20 + el.l21 * t + el.l22 * t2,
        xp: el.x1 + 2.0 * el.x2 * t + 3.0 * el.x3 * t2,
        yp: el.y1 + 2.0 * el.y2 * t + 3.0 * el.y3 * t2,
        l1p: el.l11 + 2.0 * el.l12 * t + 3.0 * el.l13 * t2,
        l2p: el.l21 + 2.0 * el.l22 * t + 3.0 * el.l23 * t2,
        get sind() { return Math.sin(this.d * Math.PI / 180.0) },
        get cosd() { return Math.cos(this.d * Math.PI / 180.0) },
        ro: 1.0, // initial value
        get zeta() { return Math.sqrt(this.ro * this.ro - this.x * this.x - this.y * this.y) },
        get costheta() { return (-this.y * this.sind + this.zeta * this.cosd) / this.ro },
        get sinfi1() { return (this.y * this.cosd + this.zeta * this.sind) / this.ro },
        get cosfi1() { return Math.sqrt((this.x / this.ro) * (this.x / this.ro) + this.costheta * this.costheta) },
        get fi1() { return Math.asin(this.sinfi1) / Math.PI * 180.0 },
        get fi() { return Math.atan(this.sinfi1 / this.cosfi1 / Math.sqrt(1 - e * e)) / Math.PI * 180.0 },
        get sinfi() { return Math.sin(this.fi * Math.PI / 180.0) },
        get ro1() { return Math.sqrt((1 - 2 * e2 * this.sinfi * this.sinfi + e4 * this.sinfi * this.sinfi) / (1 - e2 * this.sinfi * this.sinfi)) },
        get sind1() { return this.sind / this.ro1 },
        get cosd1() { return Math.sqrt(1 - e2) * (this.cosd / this.ro1) },
        get zeta1() { return Math.sqrt(this.ro1 * this.ro1 - this.x * this.x - this.y * this.y) },
        get costheta1() { return (-this.y * this.sind1 + this.zeta1 * this.cosd1) / this.ro1 },
        get tantheta() { return this.x / this.costheta1 },
        get theta() { return Math.atan(this.tantheta) / Math.PI * 180.0 },
        get varpi() { return (this.u - this.theta)*this.ro1 - (this.costheta1 > 0 ? 0.0 : 180.0) },
        get cosfi2() { return this.costheta1 / Math.cos(this.theta / 180.0 * Math.PI) },
        get fi2() { return Math.acos(this.cosfi2) / Math.PI * 180.0 },
        get phi() { return Math.atan(Math.tan(this.fi2 / 180.0 * Math.PI) / Math.sqrt(1 - e2)) / Math.PI * 180.0 * (this.costheta1 > 0 ? 1.0 : -1.0) },
    }; 
    
    
    return this.c = c;
}


module.exports = {
    Eclipse2: Eclipse2,
    e20160226: e20160226,
    e20260812: e20260812
};