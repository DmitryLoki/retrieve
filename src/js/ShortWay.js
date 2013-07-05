define(function() {
	var ShortWay = function() {
		this.EARTH_RADIUS = 6378137;
		this.APPROXIMATION_CYCLES = 8;
		this.METERS_IN_LAT_DEGREE = this.lonCoefficientForLat(0);
	}

	ShortWay.prototype.calculate = function(data) {
		if (!data || data.length < 2) return []; 
		for (var cycl = 0; cycl < this.APPROXIMATION_CYCLES; cycl++) {
			for (var i = 1; i < data.length-1; i++) {
				if (!data[i-1].aPoint) data[i-1].aPoint = {lat:data[i-1].lat,lng:data[i-1].lng};
				if (!data[i+1].aPoint) data[i+1].aPoint = {lat:data[i+1].lat,lng:data[i+1].lng};
				data[i].aPoint = this.calculatePoint(data[i],data[i-1].aPoint,data[i+1].aPoint);
			}
		}
		data[0].aPoint = this.calculateEndPoint(data[0],data[1].aPoint);
		data[data.length-1].aPoint = this.calculateEndPoint(data[data.length-1],data[data.length-2].aPoint);
		var out = [];
		for (var i = 0; i < data.length; i++)
			out.push({lat:data[i].aPoint.lat,lng:data[i].aPoint.lng,id:data[i].id});
		return out;
	}

	ShortWay.prototype.calculatePoint = function(curr,prev,next) {
		var p = this.calculateIntersection(curr,prev,next);
		if (p) return p;
		var az = this.getHalfAzimuth(this.getAzimuth(curr,prev),this.getAzimuth(curr,next));
		return this.getCoordinates(curr,az);
	}

	ShortWay.prototype.calculateEndPoint = function(curr,next) {
		var d = this.distanceBetween(curr.lat,curr.lng,next.lat,next.lng);
		return {lat:curr.lat+(next.lat-curr.lat)*curr.radius/d,lng:curr.lng+(next.lng-curr.lng)*curr.radius/d};
	}

	ShortWay.prototype.deg2rad = function(deg) {
		return deg / 180 * Math.PI;
	}

	ShortWay.prototype.rad2deg = function(rad) {
		return rad / Math.PI * 180;
	}

	// возвращает координаты точки пересечения цилиндра curr и луча, выпущенного из его центра по направлению az
	ShortWay.prototype.getCoordinates = function(curr,az) {
		var latRadius = curr.radius/this.METERS_IN_LAT_DEGREE;
		var lngRadius = curr.radius/this.lonCoefficientForLat(curr.lat);
		return {lat:curr.lat+Math.cos(this.deg2rad(az))*latRadius,lng:curr.lng+Math.sin(this.deg2rad(az))*lngRadius};
	}

	ShortWay.prototype.getAzimuth = function(point1,point2) {
		var dLat = Math.floor((point2.lat - point1.lat)*10000);
		var dLng = Math.floor((point2.lng - point1.lng)*10000);
		if (dLng == 0) return dLat > 0 ? 0 : 180;
		if (dLat == 0) return dLng > 0 ? 90 : 270;
		var azimuth = this.rad2deg(Math.atan((point2.lng-point1.lng)/(point2.lat-point1.lat)));
		if (dLat < 0) azimuth += 180;
		else if (dLng < 0) azimuth += 360;
		return this.filterAzimuth(azimuth);
	}

	ShortWay.prototype.getHalfAzimuth = function(azimuth1,azimuth2) {
		var halfAzimuth = (azimuth1 + azimuth2) / 2;
		if (Math.abs(azimuth2 - azimuth1) > 180)
			halfAzimuth -= 180;
		return this.filterAzimuth(halfAzimuth);
	}

	ShortWay.prototype.filterAzimuth = function(azimuth) {
		while (azimuth < 0) azimuth += 360;
		while (azimuth > 360) azimuth -= 360;
		return azimuth;
	}

	ShortWay.prototype.distanceBetween = function(lat1,lng1,lat2,lng2) {
		var dLat = lat2 - lat1;
		var dLng = lng2 - lng1;
		var dLatSin = Math.sin(this.deg2rad(dLat)/2);
		var dLngSin = Math.sin(this.deg2rad(dLng)/2);
		var dLatCos1 = Math.cos(this.deg2rad(lat1));
		var dLatCos2 = Math.cos(this.deg2rad(lat2));
		var a = dLatSin*dLatSin + dLatCos1*dLatCos2*dLngSin*dLngSin;
		return 2*Math.asin(Math.sqrt(a))*this.EARTH_RADIUS;
	}

	ShortWay.prototype.lonCoefficientForLat = function(lat) {
		return this.distanceBetween(lat,0,lat,1);
	}

	// Отдает {lat:,lng:} точку пересечения прямой [prev,next] с цилиндром curr (ближайшую к prev) или null, если пересечения нет
	ShortWay.prototype.calculateIntersection = function(curr,prev,next) {
		var kLat = this.METERS_IN_LAT_DEGREE;
		var kLng = this.lonCoefficientForLat(curr.lat);		
		var x1 = (prev.lng-curr.lng)*kLng;
		var y1 = (prev.lat-curr.lat)*kLat;
		var x2 = (next.lng-curr.lng)*kLng;
		var y2 = (next.lat-curr.lat)*kLat;
		var p = this.calculateIntersectionGeom(x1,y1,x2,y2,curr.radius);
		if (!p) return null;
		return {lat:curr.lat+p[1]/kLat,lng:curr.lng+p[0]/kLng};
	}

	// Отдает точку пересечения окружности с центром в 0 радиуса r и отрезка, проходящего через точки (x1,y1), (x2,y2)
	// Если 2 точки, отдает ближайшую к x1,y1
	ShortWay.prototype.calculateIntersectionGeom = function(x1,y1,x2,y2,r) {
		var dx = x2 - x1;
		var dy = y2 - y1;
		var dr = Math.sqrt(dx*dx + dy*dy);
		var D = (x1 * y2 - y1 * x2);
		var sqrt = r*r*dr*dr - D*D;
		if (sqrt < 0) return null;
		sqrt = Math.sqrt(sqrt);
		var s = dy < 0 ? -1 : 1;
		var DdY = D * dy;
		var DdX = -D * dx;
		var p1x = (DdY+dx*s*sqrt)/dr/dr;
		var p1y = (DdX+Math.abs(dy)*sqrt)/dr/dr;
		var p2x = (DdY-dx*s*sqrt)/dr/dr;
		var p2y = (DdX-Math.abs(dy)*sqrt)/dr/dr;

		var p1between = this.isBetween(x1,p1x,x2) && this.isBetween(y1,p1y,y2);
		var p2between = this.isBetween(x1,p2x,x2) && this.isBetween(y1,p2y,y2);

		if (p1between && p2between)
			return Math.pow(p1x-x1,2)+Math.pow(p1y-y1,2)<Math.pow(p2x-x1,2)+Math.pow(p2y-y1,2) ? [p1x,p1y] : [p2x,p2y];
		else if (p1between)
			return [p1x,p1y];
		else if (p2between)
			return [p2x,p2y];
		return null;
	}

	ShortWay.prototype.isBetween = function(a,x,b) {
		return (a <= x && x <= b) || (b <= x && x <= a);
	}

	return ShortWay;
});