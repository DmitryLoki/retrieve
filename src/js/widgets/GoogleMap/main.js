define(["jquery","knockout","utils","EventEmitter","google.maps"], function($,ko,utils,EventEmitter,gmaps){

	// requestAnim shim layer by Paul Irish
    var requestAnimFrame = (function() {
      return  window.requestAnimationFrame       || 
              window.webkitRequestAnimationFrame || 
              window.mozRequestAnimationFrame    || 
              window.oRequestAnimationFrame      || 
              window.msRequestAnimationFrame     || 
              function(/* function */ callback, /* DOMElement */ element){
                window.setTimeout(callback, 1000 / 60);
              };
    })();

	var MapFloatElem = function(params){
		this._params = params;
	};
	MapFloatElem.prototype = new gmaps.OverlayView;
	MapFloatElem.prototype.onRemove = function(){
		ko.cleanNode(this._div);
		this._div.parentNode.removeChild(this._div);
	};
	MapFloatElem.prototype.draw = function(){
		if(!this._coords)
			return;
		var proj = this.getProjection();
		if(!proj)
			return;
		var coords = proj.fromLatLngToDivPixel(this._coords);
		this._div.style.left = coords.x + 'px';
		this._div.style.top = coords.y + 'px';
	};
	MapFloatElem.prototype.onAdd = function(){
		var div = document.createElement('div');
		div.style.position = 'absolute';
		div.style.left = '99999px';
		div.style.top = '99999px';
		div.innerHTML = this._params.template;
		var panes = this.getPanes();
		panes.floatPane.appendChild(div);
		this._div = div;
		ko.applyBindings(this._params.data, div);
	};
	MapFloatElem.prototype.move = function(coords){
		this._coords = coords;
		this.draw();
	};
	MapFloatElem.prototype.setPosition = function(coords) {
		return this.move(coords);
	}


	var Ufo = function(params) {
		this._params = params;
		this._map = params.map;
		this._visible = false;
		this._titleVisible = true;
		this._trackVisible = true;
		this._animating = false;
		this.hasAsyncInit = true;
	}

	utils.extend(Ufo.prototype,EventEmitter.prototype);

	Ufo.prototype.asyncInit = function(callback) {
		var self = this;
		this._model = new gmaps.Marker({
			flat: true,
			title: self._params.name,
			map: self._params.map._map
		});
		this._titleModel = new MapFloatElem({
			template: self._params.titleTemplate,
			data: {
				title: self._params.name,
				color: self._params.color
			}
		});
		this._trackModel = new gmaps.Polyline({
			strokeColor: self._params.color,
			strokeOpacity: 1,
			strokeWeight: 1,
			map: self._params.map._map
		});
		self._trackDtPosition = null;
		callback();
	}

	Ufo.prototype.icon = function(params) {
		if (this._model)
			this._model.setIcon(new gmaps.MarkerImage(params.url, new gmaps.Size(params.width, params.height), new gmaps.Point(0,0), new gmaps.Point(params.x, params.y)));
		return this;
	}

	Ufo.prototype._visibilityUpdate = function() {
		if (this._model)
			this._model.setMap(this._visible ? this._params.map._map : null);
		if (this._titleModel)
			this._titleModel.setMap(this._visible && this._titleVisible ? this._params.map._map : null);
		if (this._trackModel)
			this._trackModel.setMap(this._visible && this._trackVisible ? this._params.map._map : null);
	}

	Ufo.prototype.move = function(coords,duration) {
		var self = this;

		// При инициализации может не быть начального положения, тогда мгновенно туда переставляем и все
		if (!this._params.lat || !this._params.lng || !this._params.elevation) {
			this._params.lat = coords.lat;
			this._params.lng = coords.lng;
			this._params.elevation = coords.elevation;
			this._params.yaw = coords.yaw;
			self.move(coords);
			return this;
		}
		// Если уже идет анимация, значит она была запущена предыдущим кадром и мы не успели ее закончить.
		// В этом случае заканчиваем старую анимацию.
		if (this._animating) {
			this._animating = false;
			var latLng = new gmaps.LatLng(this._params.lat,this._params.lng);
			this._model.setPosition(latLng);
			this._titleModel.setPosition(latLng);
		}

		// Анимации нет. Если не указан duration, то просто мгновенно переставляем модель на новое положение и все.
		if (!duration || duration == 0) {
			this._params.lat = coords.lat;
			this._params.lng = coords.lng;
			this._params.elevation = coords.elevation;
			this._params.yaw = coords.yaw;
			var latLng = new gmaps.LatLng(this._params.lat,this._params.lng);
			this._model.setPosition(latLng);
			this._titleModel.setPosition(latLng);
			return this;
		}
		// Основной случай. Анимация указана.
		// animationStartCoords - стартовые координаты, с которых начинаем анимацию. 
		// В данный момент модель должна находится в этих координатах.
		this._animationStartCoords = {
			lat: this._params.lat,
			lng: this._params.lng,
			elevation: this._params.elevation,
			yaw: this._params.yaw
		}
		// в _params ставим конечные координаты. 
		// Как бы координаты уже проставлены, но фактическое положение модели запаздывает и придет в них после анимации.
		this._params.lat = coords.lat;
		this._params.lng = coords.lng;
		this._params.elevation = coords.elevation;
		this._params.yaw = coords.yaw;

		this._animationStartTime = (new Date).getTime();

		var animate = function() {
			var p = ((new Date).getTime() - self._animationStartTime) / duration;
			// Заканчиваем анимацию
			if (p >= 1) {
				p = 1;
				self._animating = false;
			}

			var yawDelta = self._params.yaw - self._animationStartCoords.yaw;
			if (yawDelta > 180) yawDelta -= 360;
			if (yawDelta < -180) yawDelta += 360;

			coords = {
				lat: self._animationStartCoords.lat + (self._params.lat - self._animationStartCoords.lat) * p,
				lng: self._animationStartCoords.lng + (self._params.lng - self._animationStartCoords.lng) * p,
				elevation: self._animationStartCoords.elevation + (self._params.elevation - self._animationStartCoords.elevation) * p,
				yaw: self._animationStartCoords.yaw + yawDelta * p
			}

			var latLng = new gmaps.LatLng(coords.lat,coords.lng);
			this._model.setPosition(latLng);
			this._titleModel.setPosition(latLng);
			if (self._animating)
				requestAnimFrame(animate);
		}

		this._animating = true;
		animate();

		return this;
	}

	Ufo.prototype.visible = function(flag) {
		if (this._visible != flag) {
			this._visible = flag;
			this._visibilityUpdate();
		}
		return this;
	}

	Ufo.prototype.titleVisible = function(flag) {
		if(this._titleVisible != flag){
			this._titleVisible = flag;
			this._visibilityUpdate();
		}
		return this;
	}

	Ufo.prototype.trackVisible = function(flag) {
		if(this._trackVisible != flag){
			this._trackVisible = flag;
			this._visibilityUpdate();
		}
		return this;
	}

	Ufo.prototype.destroy = function() {
		if (this._model)
			this._model.setMap(null);
		if (this._titleModel)
			this._titleModel.setMap(null);
		if (this._trackModel)
			this._trackModel.setMap(null);
		this.emit("destroy");
	}

	Ufo.prototype.trackUpdate = function(data) {
		if (!this._trackVisible || !data || !this._trackModel) return;
		if (data && this._trackLastData && data.start == this._trackLastData.start && data.end == this._trackLastData.end) return;

		var path = this._trackModel.getPath();

		// Удаляем точки из трека, которых уже нет в новой data
		var i2destroy = {};
		if (this._trackLastData) {
			for (var i in this._trackLastData.data)
				if (this._trackLastData.data.hasOwnProperty(i) && !data.data[i]) {
					i2destroy[i] = true; 
					// todo: удалить из path координаты на время i
				}
		}
		for (var i = 0; i < path.getLength(); i++) {
			var elem = path.getAt(i);
			if (elem.dtIndex && i2destroy[elem.dtIndex]) {
				path.removeAt(i);
				i--;
			}
		}

		// Удаляем последнюю точку из path, потому что она - текущее положение параплана, которое поменялось
		var n = path.getLength();
		if (n > 0) path.removeAt(n-1);

		// Добавляем точки из data, которых нет в _trackLastData
		var ind = 0;
		for (var i in data.data) {
			if (data.data.hasOwnProperty(i)) {
				if (!this._trackLastData || !this._trackLastData.data[i]) {
					var latLng = new gmaps.LatLng(data.data[i].lat,data.data[i].lng);
					latLng.dtIndex = i;
					path.insertAt(ind,latLng);
				}
				ind++;
			}
		}

		// добавляем в конец текущее положение параплана
		path.push(new gmaps.LatLng(this._params.lat,this._params.lng));
		this._trackLastData = data;
	}

	var Waypoint = function(params) {
		params.color = "#00ff00";
		if (params.type == "start")
			params.color = "#ff0000";
		else if (params.type == "finish")
			params.color = "#0000ff";
		this._params = params;
		this._map = params.map;

		this.redraw();
	}

	utils.extend(Waypoint.prototype,EventEmitter.prototype);

	Waypoint.prototype.redraw = function() {
		if (!this._model) 
			this._model = new gmaps.Circle({
			strokeColor: this._params.color,
			strokeOpacity: 0.8,
			strokeWeight: 1,
			fillColor: this._params.color,
			fillOpacity: 0.2,
			map: this._map._map,
			center: new gmaps.LatLng(this._params.lat,this._params.lng),
			radius: this._params.radius
		});
		if (!this._titleModel)
			this._titleModel = new MapFloatElem({
			template: this._params.titleTemplate,
			data: {
				title: this._params.name,
				color: this._params.color
			}
		});
		if (this._map.cylindersVisualMode() == "off") {
			this._model.setMap(null);
			this._titleModel.setMap(null);
		}
		else {
			this._model.set("fillOpacity",this._map.cylindersVisualMode() == "full" ? 0.2 : 0);
			this._model.setMap(this._map._map);
			this._titleModel.setMap(this._map._map);
			this._titleModel.move(this._model.getBounds().getNorthEast());
		}
	}

	Waypoint.prototype.destroy = function() {
		if (this._model)
			this._model.setMap(null);
		this.emit("destroy");
	}


	var GoogleMap = function() {
		this.width = ko.observable('320px');
		this.height = ko.observable('240px');

		var self = this;
		function updateSize() {
			if(self.map)
				gmaps.event.trigger(self.map, 'resize');
		}
		this.width.subscribe(updateSize);
		this.height.subscribe(updateSize);
		
		this._ufos = [];
		this._waypoints = [];

		this.tracksVisualMode = ko.observable();
		this.cylindersVisualMode = ko.observable();
		this.modelsVisualMode = ko.observable();
		this.shortWayVisualMode = ko.observable();
	}

	GoogleMap.prototype.setTracksVisualMode = function(v) {
		this.tracksVisualMode(v);
	}

	GoogleMap.prototype.setCylindersVisualMode = function(v) {
		this.cylindersVisualMode(v);
		this._waypoints.forEach(function(waypoint) {
			waypoint.redraw();
		});
	}

	GoogleMap.prototype.setModelsVisualMode = function(v) {
		this.modelsVisualMode(v);
	}

	GoogleMap.prototype.setShortWayVisualMode = function(v) {
		this.shortWayVisualMode(v);
		this.redrawShortWay();
	}

	GoogleMap.prototype.setCameraPosition = function(p) {
		if (this._map && p && p.latitude && p.longitude) {
			this._map.setCenter(new gmaps.LatLng(p.latitude,p.longitude));
		}
	}

	// Добавлен для соответствия с OwgMap
	GoogleMap.prototype.setCameraLookAtPosition = function(p) {
		if (this._map && p && p.latitude && p.longitude) {
			this._map.setCenter(new gmaps.LatLng(p.latitude,p.longitude));
		}
	}

	GoogleMap.prototype.ufo = function(params) {
		var self = this;
		params.map = self;
		params.titleTemplate = self.templates.markerTitle;
		var ufo = new Ufo(params);
		self._ufos.push(ufo);
		ufo.on("destroy",function() {
			self._ufos.splice(self._ufos.indexOf(ufo),1);
		});
		return ufo;
	}

	GoogleMap.prototype.waypoint = function(params) {
		var self = this;
		params.map = self;
		params.titleTemplate = self.templates.waypointTitle;
		var waypoint = new Waypoint(params);
		this._waypoints.push(waypoint);
		waypoint.on("destroy",function() {
			self._waypoints.splice(self._waypoints.indexOf(waypoint),1);
		});
		return waypoint;
	}

	GoogleMap.prototype.setShortWay = function(ar) {
		this._shortWay = ar.data;
		this._shortWayOptions = ar.options;
		this.redrawShortWay();
	}

	GoogleMap.prototype.redrawShortWay = function() {
		if (!this._shortWay) return;
		if (!this._shortWayModel)
			this._shortWayModel = new gmaps.Polyline(this._shortWayOptions.wide);
		if (this.shortWayVisualMode() == "off") {
			this._shortWayModel.setMap(null);
			return;
		}
		this._shortWayModel.setOptions(this._shortWayOptions[this.shortWayVisualMode()]);
		this._shortWayModel.setMap(this._map);
		var ar = [];
		this._shortWay.forEach(function(rw) {
			ar.push(new gmaps.LatLng(rw.lat,rw.lng));
		});
		this._shortWayModel.setPath(ar);
	}

	GoogleMap.prototype.domInit = function(elem,params) {
		if (params.width)
			this.width(params.width);
		if (params.height)
			this.height(params.height);

		var div = ko.virtualElements.firstChild(elem);
		while(div && div.nodeType != 1)
			div = ko.virtualElements.nextSibling(div);
		ko.virtualElements.prepend(elem,div);
		
		this._map = new gmaps.Map(div,{
			zoom: 13,
			center: new gmaps.LatLng(55.748758, 37.6174),
			mapTypeId: gmaps.MapTypeId.TERRAIN
		});
	}
	
	GoogleMap.prototype.domDestroy = function(elem,params) {
		delete this._map;
	};

	GoogleMap.prototype.templates = ['main', 'markerTitle', 'waypointTitle'];

	return GoogleMap;
});
