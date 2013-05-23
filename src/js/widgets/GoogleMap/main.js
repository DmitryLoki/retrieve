define(["jquery","knockout","utils","EventEmitter","google.maps","config"],function($,ko,utils,EventEmitter,gmaps,config) {

	var MapFloatElem = function(params) {
		this._params = params;
	}
	MapFloatElem.prototype = new gmaps.OverlayView;
	MapFloatElem.prototype.onRemove = function() {
		ko.cleanNode(this._div);
		this._div.parentNode.removeChild(this._div);
	}
	MapFloatElem.prototype.draw = function() {
		if(!this._coords)
			return;
		var proj = this.getProjection();
		if(!proj)
			return;
		var coords = proj.fromLatLngToDivPixel(this._coords);
		if (this._div) {
			this._div.style.left = coords.x + "px";
			this._div.style.top = coords.y + "px";
		}
	}
	MapFloatElem.prototype.onAdd = function() {
		var div = document.createElement("div");
		div.style.position = "absolute";
		div.style.left = "99999px";
		div.style.top = "99999px";
		div.innerHTML = this._params.template;
		var panes = this.getPanes();
		panes.floatPane.appendChild(div);
		this._div = div;
		ko.applyBindings(this._params.data, div);
	}
	MapFloatElem.prototype.move = function(coords) {
		this._coords = coords;
		this.draw();
	}
	MapFloatElem.prototype.setPosition = function(coords) {
		return this.move(coords);
	}

	var GoogleMap = function(options) {
		var self = this;

		this.ufos = options.ufos;
		this.waypoints = options.waypoints;
		this.shortWay = options.shortWay;
		this.tracksVisualMode = options.tracksVisualMode;
		this.cylindersVisualMode = options.cylindersVisualMode;
		this.modelsVisualMode = options.modelsVisualMode;
		this.shortWayVisualMode = options.shortWayVisualMode;
		this.namesVisualMode = options.namesVisualMode;
		this.currentKey = options.currentKey;
		this.imgRootUrl = options.imgRootUrl;
		this.zoom = ko.observable(config.map.zoom);
		this.isReady = ko.observable(false);
		this.mapOptions = options.mapOptions;

		this.mapWaypoints = [];
		this.waypoints.subscribe(function(waypoints) {
			if (!self.isReady()) return;
			var rev1 = {}, rev2 = {};
			for (var i = 0; i < waypoints.length; i++)
				rev1[waypoints[i].id()] = i;
			for (var i = 0; i < self.mapWaypoints.length; i++)
				rev2[self.mapWaypoints[i].id()] = i;
			for (var i = 0; i < waypoints.length; i++) {
				if (rev2[waypoints[i].id()] == null) {
					self.mapWaypoints.push(self.createWaypoint(waypoints[i]));
					rev2[waypoints[i].id()] = self.mapWaypoints.length - 1;
				}
			}
			for (var i = 0; i < self.mapWaypoints.length; i++) {
				if (rev1[self.mapWaypoints[i].id()] == null) {
					self.destroyWaypoint(self.mapWaypoints[i]);
					self.mapWaypoints.splice(i,1);
					i--;
				}
			}
		});

		this.mapUfos = [];
		this.ufos.subscribe(function(ufos) {
			if (!self.isReady()) return;
			var rev1 = {}, rev2 = {};
			for (var i = 0; i < ufos.length; i++)
				rev1[ufos[i].id()] = i;
			for (var i = 0; i < self.mapUfos.length; i++)
				rev2[self.mapUfos[i].id()] = i;
			for (var i = 0; i < ufos.length; i++) {
				if (rev2[ufos[i].id()] == null) {
					self.mapUfos.push(self.createUfo(ufos[i]));
					rev2[ufos[i].id()] = self.mapUfos.length - 1;
				}
			}
			for (var i = 0; i < self.mapUfos.length; i++) {
				if (rev1[self.mapUfos[i].id()] == null) {
					self.detroyUfo(self.mapUfos[i]);
					self.mapUfos.splice(i,1);
					i--;
				}
			}
		});

		this.mapShortWay = null;
		this.shortWay.subscribe(function(w) {
			if (!self.isReady()) return;
			self.destroyShortWay();
			self.createShortWay(w);
		});

		this.zoom.subscribe(function() {
			self.refreshShortWayArrows();
		});

		this.mapOptions.subscribe(function(options) {
			if (!self.isReady()) return;
			self.map.setOptions(options);
		})
	}

	GoogleMap.prototype.createWaypoint = function(data) {
		var self = this;
		var w = {
			id: data.id,
			name: data.name,
			type: data.type,
			center: data.center,
			radius: data.radius,
			openKey: data.openKey,
		}
		w.state = ko.computed(function() {
			return w.openKey() < self.currentKey() ? "opened" : "closed";
		});
		w.color = ko.computed(function() {
			return  config.waypointsColors[w.type()] ? config.waypointsColors[w.type()][w.state()] : config.waypoint.color;
		});
		w.fillOpacity = ko.computed(function() {
			return self.cylindersVisualMode() == "empty" ? 0 : config.waypoint.fillOpacity;
		});
		w.visible = ko.computed(function() {
			return self.cylindersVisualMode() == "off" ? false : true;
		});
		w.titlePosition = ko.computed(function() {
			if (!self.shortWay())
				return w.center();
			for (var i = 0, l = self.shortWay().length; i < l; i++) {
				if (self.shortWay()[i].id == w.id())
					return self.shortWay()[i];
			}
			return w.center();
		});
		w._model = new gmaps.Circle({
			strokeColor: w.color(),
			strokeOpacity: config.waypoint.strokeOpacity,
			strokeWeight: config.waypoint.strokeWeight,
			fillOpacity: w.fillOpacity(),
			fillColor: w.color(),
			map: self.map,
			center: new gmaps.LatLng(w.center().lat,w.center().lng),
			radius: w.radius(),
		});
		w._titleModel = new MapFloatElem({
			template: self.templates.waypointTitle,
			data: {
				title: w.name,
				color: w.color
			}
		});
		w._titleModel.setMap(self.map);
		w._titleModel.setPosition(new gmaps.LatLng(w.titlePosition().lat,w.titlePosition().lng));

		w.visibleSubscribe = w.visible.subscribe(function(v) {
			w._model.setMap(v?self.map:null);
			w._titleModel.setMap(v?self.map:null);
		});
		w.colorSubscribe = w.color.subscribe(function(v) {
			w._model.set("strokeColor",v);
			w._model.set("fillColor",v);
		});
		w.fillOpacitySubscribe = w.fillOpacity.subscribe(function(v) {
			w._model.set("fillOpacity",v);
		});
		w.centerSubscribe = w.center.subscribe(function(v) {
			w._model.setPosition(new gmaps.LatLng(v.lat,v.lng));
		});
		w.titlePositionSubscribe = w.titlePosition.subscribe(function(v) {
			w._titleModel.setPosition(new gmaps.LatLng(v.lat,v.lng));
		});
		w.radiusSubscribe = w.radius.subscribe(function(v) {
			w._model.set("radius",v);
		});
		return w;
	}

	GoogleMap.prototype.destroyWaypoint = function(w) {
		if (w._model)
			w._model.setMap(null);
		if (w._titleModel)
			w._titleModel.setMap(null);
		w.visibleSubscribe.dispose();
		w.colorSubscribe.dispose();
		w.fillOpacitySubscribe.dispose();
		w.centerSubscribe.dispose();
		w.titlePositionSubscribe.dispose();
		w.radiusSubscribe.dispose();
	}

	GoogleMap.prototype.createUfo = function(data) {
		var self = this;
		var u = {
			id: data.id,
			name: data.name,
			color: data.color,
			state: data.state,
			position: data.position,
			track: data.track,
			visible: data.visible,
			trackVisible: data.trackVisible,
			noData: data.noData,
			trackData: []
		}
		u._model = new gmaps.Marker({
			flat: config.ufo.flat,
			map: self.map
		});
		u._titleModel = new MapFloatElem({
			template: self.templates.markerTitle,
			data: {
				title: u.name,
				color: u.color
			}
		});
		u._trackModel = new gmaps.Polyline({
			strokeColor: u.color(),
			strokeOpacity: config.ufo.trackStrokeOpacity,
			strokeWeight: config.ufo.trackStrokeWeight,
			map: self.map
		});
		u._trackBeginModel = new gmaps.Polyline({
			strokeColor: u.color(),
			strokeOpacity: config.ufo.trackStrokeOpacity,
			strokeWeight: config.ufo.trackStrokeWeight,
			map: self.map
		});

		u.modelVisible = ko.computed(function() {
			return u.visible() && !u.noData();
		});

		u.titleVisible = ko.computed(function() {
			return u.visible() && !u.noData() && (self.namesVisualMode() == "on" || (self.namesVisualMode() == "auto" && self.zoom() >= config.namesVisualModeAutoMinZoom));
		});

		u.trackModelVisible = ko.computed(function() {
			return u.visible() && !u.trackVisible() && (self.tracksVisualMode() == "full" || self.tracksVisualMode() == "10min");
		});

		u.icon = ko.computed(function() {
			u.visible();
//			return u.state() + self.modelsVisualMode();
			var icon = "fly" + self.modelsVisualMode();
			return icon;
		});

		u._trackBegin = ko.computed(function() {
			if (u.trackModelVisible() && u.track() && u.track().dt && u.position() && u.position().lat && u.position().lng && (self.tracksVisualMode() == "full" || self.tracksVisualMode() == "10min")) {
				var path = [
					new gmaps.LatLng(u.track().lat,u.track().lng),
					new gmaps.LatLng(u.position().lat,u.position().lng)
				];
				u._trackBeginModel.setPath(path);
			}
		});

		u.colorSubscribe = u.color.subscribe(function(v) {
			u._trackModel.set("strokeColor",v);
			u._trackBeginModel.set("strokeColor",v);
		});

		u.modelVisibleSubscribe = u.modelVisible.subscribe(function(v) {
			u._model.setMap(v?self.map:null);
		});

		u.titleVisibleSubscribe = u.titleVisible.subscribe(function(v) {
			u._titleModel.setMap(v?self.map:null);
		});

		u.trackModelVisibleSubscribe = u.trackModelVisible.subscribe(function(v) {
			u._trackModel.setMap(v?self.map:null);
			u._trackBeginModel.setMap(v?self.map:null);
			if (u.position() && u.position().lat && u.position().lng) {
				u._trackModel.setPath([new gmaps.LatLng(u.position().lat,u.position().lng)]);
				u.trackData = [u.position()];
			}
			else {
				u._trackModel.setPath([]);
				u.trackData = [];
			}
			var p = u._trackBeginModel.setPath([]);
		});

		u.iconSubscribe = u.icon.subscribe(function(v) {
			var params = config.icons[v];
			if (v && params)
				u._model.setIcon(new gmaps.MarkerImage(self.imgRootUrl()+params.url, new gmaps.Size(params.width,params.height),new gmaps.Point(0,0),new gmaps.Point(params.x,params.y)));
		});

		u.positionSubscribe = u.position.subscribe(function(v) {
			if (v && v.lat && v.lng) {
				var ll = new gmaps.LatLng(v.lat,v.lng);
				u._model.setPosition(ll);
				u._titleModel.setPosition(ll);
			}
		});

		u.trackSubscribe = u.track.subscribe(function(v) {
			if (u.trackModelVisible() && (self.tracksVisualMode() == "full" || self.tracksVisualMode() == "10min")) {
				var path = u._trackModel.getPath();
				if (v.dt == null) {
					path.clear();
					u.trackData = [];
				}
				else {
					path.push(new gmaps.LatLng(v.lat,v.lng));
					u.trackData.push(v);
				}
				if (self.tracksVisualMode() == "10min") {
					while (u.trackData[0] && (v.dt > u.trackData[0].dt + 60000)) {
						path.removeAt(0);
						u.trackData.splice(0,1);
					}
				}
			}
		});

		u.position.valueHasMutated();
		u.visible.valueHasMutated();

		return u;
	}

	GoogleMap.prototype.destroyUfo = function(u) {
		if (u._model)
			u._model.setMap(null);
		if (u._titleModel)
			u._titleModel.setMap(null);
		if (u._trackModel)
			u._trackModel.setMap(null);
		u.colorSubscribe.dispose();
		u.modelVisibleSubscribe.dispose();
		u.titleVisibleSubscribe.dispose();
		u.trackModelVisibleSubscribe.dispose();
		u.iconSubscribe.dispose();
		u.positionSubscribe.dispose();
		u.trackSubscribe.dispose();
	}

	GoogleMap.prototype.createShortWay = function(data) {
		var self = this;
		if (!data) return;

		var w = {};

		w.style = ko.computed(function() {
			return config.shortWay[self.shortWayVisualMode()];
		});
		w.visible = ko.computed(function() {
			return self.shortWayVisualMode() == "off" ? 0 : 1;
		});

		w._models = [];
		for (var i = 0; i < data.length-1; i++) {
			var m = new gmaps.Polyline(w.style());
			var p1 = new gmaps.LatLng(data[i].lat,data[i].lng);
			var p2 = new gmaps.LatLng(data[i+1].lat,data[i+1].lng);
			m.setPath([p1,p2]);
			m.setMap(this.map);
			w._models.push(m);
		}

		w.styleSubscribe = w.style.subscribe(function(v) {
			for (var i = 0; i < w._models.length; i++)
				w._models[i].setOptions(v);
		});
		w.visibleSubscribe = w.visible.subscribe(function(v) {
			for (var i = 0; i < w._models.length; i++)
				w._models[i].setMap(v?self.map:null);
		});

		this.mapShortWay = w;
		this.refreshShortWayArrows();
	}

	GoogleMap.prototype.refreshShortWayArrows = function() {
		var self = this;
		if (!this.mapShortWay || !this.map) return;
		var style = [{icon:{path:gmaps.SymbolPath.FORWARD_OPEN_ARROW},offset:"50%"}];
		for (var i = 0; i < this.mapShortWay._models.length; i++) {
			var m = this.mapShortWay._models[i];
			var path = m.getPath();
			if (this.map && this.map.getProjection() && path && path.getAt(0) && path.getAt(1)) {
				var p1 = self.map.getProjection().fromLatLngToPoint(m.getPath().getAt(0));
				var p2 = self.map.getProjection().fromLatLngToPoint(m.getPath().getAt(1));
				var dist = Math.sqrt(Math.pow(p1.x-p2.x,2)+Math.pow(p1.y-p2.y,2))*Math.pow(2,this.zoom());
				m.set("icons",dist > config.shortWayMinSegmentLengthToShowArrow ? style : []);
			}
		}
	}

	GoogleMap.prototype.destroyShortWay = function() {
		if (this.mapShortWay) {
			if (this.mapShortWay._models)
				for (var i = 0; i < this.mapShortWay._models.length; i++)
					this.mapShortWay._models[i].setMap(null);
			this.mapShortWay.styleSubscribe.dispose();
			this.mapShortWay.visibleSubscribe.dispose();
			delete this.mapShortWay;
		}
	}

/*
	GoogleMap.prototype.createShortWay = function(data) {
		var self = this;
		if (!data) return;
		var ar = [];
		for (var i = 0; i < data.length; i++)
			ar.push(new gmaps.LatLng(data[i].lat,data[i].lng));
		var w = {};
		w.style = ko.computed(function() {
			var ar = config.shortWay[self.shortWayVisualMode()];
			ar.icons = [{
				icon: {
					path: gmaps.SymbolPath.FORWARD_OPEN_ARROW
				},
				offset: "50%"
			}];
			console.log(ar,gmaps.SymbolPath);
			return ar;
		});
		w.visible = ko.computed(function() {
			return self.shortWayVisualMode() == "off" ? 0 : 1;
		});
		w._model = new gmaps.Polyline(w.style());
		w._model.setMap(this.map);
		w._model.setPath(ar);
		w.style.subscribe(function(v) {
			w._model.setOptions(v);
		});
		w.visible.subscribe(function(v) {
			w._model.setMap(v?self.map:null);
		});
		this.mapShortWay = w;
	}

	GoogleMap.prototype.destroyShortWay = function() {
		if (this.mapShortWay) {
			if (this.mapShortWay._model)
				this.mapShortWay._model.setMap(null);
			delete this.mapShortWay;
		}
	}
*/


	GoogleMap.prototype.calculateAndSetDefaultPosition = function() {
		if (!this.map || !this.shortWay()) return;
		var bounds = new gmaps.LatLngBounds();
		for (var i = 0, l = this.shortWay().length; i < l; i++) {
			w = this.shortWay()[i];
			bounds.extend(new gmaps.LatLng(w.lat,w.lng));
		}
		this.map.fitBounds(bounds);
/*
		if (!this.map || !this.mapWaypoints) return;
		var bounds = new gmaps.LatLngBounds();
		for (var i = 0; i < this.mapWaypoints.length; i++) {
			w = this.mapWaypoints[i];
			bounds.extend(new gmaps.LatLng(w.center().lat,w.center().lng));
		}
		this.map.fitBounds(bounds);
*/
	}

	GoogleMap.prototype.domInit = function(elem,params) {
		var self = this;
		var div = ko.virtualElements.firstChild(elem);
		while(div && div.nodeType != 1)
			div = ko.virtualElements.nextSibling(div);
		ko.virtualElements.prepend(elem,div);
		this.map = new gmaps.Map(div,{
			zoom: config.map.zoom,
			center: new gmaps.LatLng(config.map.center.lat,config.map.center.lng),
			mapTypeId: gmaps.MapTypeId[config.map.type]
		});
		gmaps.event.addListener(this.map,"zoom_changed",function() {
			self.zoom(self.map.getZoom());
		});
		this.isReady(true);
		this.mapOptions.valueHasMutated();
	}
	
	GoogleMap.prototype.domDestroy = function(elem,params) {
		delete this.map;
	}

	GoogleMap.prototype.templates = ["main", "markerTitle", "waypointTitle"];

	return GoogleMap;
});
