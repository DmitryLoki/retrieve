define(["jquery","knockout","utils","EventEmitter","google.maps","./CanvasOverlay","config"],function($,ko,utils,EventEmitter,gmaps,CanvasOverlay,config) {

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
			if (this._params.xPosition == "right")
				this._div.style.left = Math.floor(coords.x-this._div.offsetWidth)+"px";
			else if (this._params.xPosition == "center")
				this._div.style.left = Math.floor(coords.x-this._div.offsetWidth/2)+"px";				
			else				
				this._div.style.left = coords.x + "px";
			if (this._params.yPosition == "bottom")
				this._div.style.top = Math.floor(coords.y-this._div.offsetHeight)+"px";
			else if (this._params.yPosition == "middle")
				this._div.style.top = Math.floor(coords.y-this._div.offsetHeight/2)+"px";
			else
				this._div.style.top = coords.y + "px";
		}
	}
	MapFloatElem.prototype.onAdd = function() {
		var div = document.createElement("div");
		div.style.position = "absolute";
		div.innerHTML = this._params.template;
		this.getPanes().floatPane.appendChild(div);
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
	MapFloatElem.prototype.setXYPosition = function(r) {
		this._params.xPosition = r.x;
		this._params.yPosition = r.y;
		this.draw();
	}


	var GoogleMap = function(options) {
		var self = this;
		this.config = config;
		this.ufos = options.ufos;
		this.waypoints = options.waypoints;
		this.shortWay = options.shortWay;
		this.tracksVisualMode = options.tracksVisualMode;
		this.cylindersVisualMode = options.cylindersVisualMode;
		this.modelsVisualMode = options.modelsVisualMode;
		this.shortWayVisualMode = options.shortWayVisualMode;
		this.namesVisualMode = options.namesVisualMode;
		this.profVisualMode = options.profVisualMode;
		this.currentKey = options.currentKey;
		this.raceKey = options.raceKey;
		this.playerState = options.playerState;
		this.imgRootUrl = options.imgRootUrl;
		this.zoom = ko.observable(config.map.zoom);
		this.isReady = ko.observable(false);
		this.mapOptions = options.mapOptions;
		this.mode = options.mode;
		this.activateMapScroll = ko.observable(false);

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
			if (!self.isReady() || !options) return;
			self.map.setOptions(options);
			self.activateMapScroll(options.scrollwheel);
		});

		this.activateMapScroll.subscribe(function(b) {
			if (!self.isReady()) return;
			self.map.setOptions({scrollwheel:b});
		});

		this.setProfVisualMode = function() {
			self.profVisualMode("prof");
		}
		this.setUserVisualMode = function() {
			self.profVisualMode("user");
		}
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
/*
		w.title = ko.computed(function() {
			if (self.profVisualMode() == "prof") return w.name();
			if (w.type() == "ordinal") {
				var n = 0;
				for (var i = 0, l = self.waypoints().length; i<l && self.waypoints()[i].id()!=w.id(); i++)
					if (self.waypoints()[i].type() == "ordinal")
						n++;
				return n+1;
			}
			return config.waypointsNames[w.type()] ? config.waypointsNames[w.type()] : "";
		});
		w.state = ko.computed(function() {
			if (self.mode() == "simple") return "opened";
			return w.openKey() < self.currentKey() ? "opened" : "closed";
		});
		w.color = ko.computed(function() {
			return  config.waypointsColors[w.type()] ? config.waypointsColors[w.type()][w.state()] : config.waypoint.color;
		});
		w.fillOpacity = ko.computed(function() {
			return self.cylindersVisualMode() == "empty" ? 0 : config.waypoint.fillOpacity;
		});
		w.modelVisible = ko.computed(function() {
			return self.cylindersVisualMode() == "off" ? false : true;
		});
		w.titleVisible = ko.computed(function() {
			var b = w.modelVisible() && self.zoom() >= config.waypointsVisualAutoMinZoom;
			return b;
		});
		w.titleXYPosition = ko.computed(function() {
			var prev = null, next = null, curr = null;
			for (var i = 0, l = self.waypoints().length; i<l && self.waypoints()[i].id()!=w.id(); i++);
			if (l == 0 || i == l || !self.waypoints || !self.waypoints() || !self.waypoints()[i]) return {x:null,y:null};
			curr = self.waypoints()[i].center();
			if (i > 0) prev = self.waypoints()[i-1].center();
			if (i+1 < l) next = self.waypoints()[i+1].center();
			if (prev == null && next == null) 
				return {x:null,y:null};
			if (prev == null)
				return {x:curr.lng>next.lng ?"left":"right",y:curr.lat>next.lat?"bottom":"top"};
			if (next == null)
				return {x:curr.lng>prev.lng ?"left":"right",y:curr.lat>prev.lat?"bottom":"top"};

			var betw = function(prev,curr,next) {
				return (prev <= curr && curr <= next) || (prev >= curr && curr >= next);
			}
			var r = {x:null,y:null};
			if (curr.lng<next.lng && curr.lng<prev.lng)
				r.x = "right";
			else if (betw(prev.lng,curr.lng,next.lng))
				r.x = "center";
			else
				r.x = "left";
			if (curr.lat>next.lat && curr.lat>prev.lat)
				r.y = "bottom";
			else if (betw(prev.lat,curr.lat,next.lat))
				r.y = "middle";
			else
				r.y = "top";

			if (r.x == "center" && r.y == "middle") {
				r.x = "left";
				r.y = (prev.lng-curr.lng)*(prev.lat-curr.lat) > 0 ? "top" : "bottom";
			}

			return r;
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
				title: w.title,
				color: w.color
			},
			xPosition: w.titleXYPosition().x,
			yPosition: w.titleXYPosition().y
		});
		w._titleModel.setMap(self.map);
		w._titleModel.setPosition(new gmaps.LatLng(w.titlePosition().lat,w.titlePosition().lng));

		w.modelVisibleSubscribe = w.modelVisible.subscribe(function(v) {
			w._model.setMap(v?self.map:null);
		});
		w.titleVisibleSubscribe = w.titleVisible.subscribe(function(v) {
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
			w._model.setCenter(new gmaps.LatLng(v.lat,v.lng));
		});
		w.titlePositionSubscribe = w.titlePosition.subscribe(function(v) {
			w._titleModel.setPosition(new gmaps.LatLng(v.lat,v.lng));
		});
		w.radiusSubscribe = w.radius.subscribe(function(v) {
			w._model.set("radius",v);
		});
		w.titleXYPosition.subscribe(function(r) {
			w._titleModel.setXYPosition(r);
		});

		w.center.valueHasMutated();
		w.modelVisible.notifySubscribers(w.modelVisible());
		w.titleVisible.notifySubscribers(w.titleVisible());
*/
		return w;
	}

	GoogleMap.prototype.destroyWaypoint = function(w) {
		if (w._model)
			w._model.setMap(null);
		if (w._titleModel)
			w._titleModel.setMap(null);
		w.modelVisibleSubscribe.dispose();
		w.titleVisibleSubscribe.dispose();
		w.colorSubscribe.dispose();
		w.fillOpacitySubscribe.dispose();
		w.centerSubscribe.dispose();
		w.titlePositionSubscribe.dispose();
		w.radiusSubscribe.dispose();
	}

	GoogleMap.prototype.prepareCoords = function(lat,lng) {
		return this.map.getProjection().fromLatLngToPoint(new gmaps.LatLng(lat,lng));
	}

	GoogleMap.prototype.createUfo = function(data) {
		var self = this;
		var u = {
			id: data.id,
			name: data.name,
			color: data.color,
			state: data.state,
			stateChangedAt: data.stateChangedAt,
			position: data.position,
			track: data.track,
			visible: data.visible,
			trackVisible: data.trackVisible,
			noData: data.noData,
			trackData: []
		}

		u.drawIcon = function(c,center,radius) {
			c.beginPath();
			c.moveTo(center.x,center.y);
			c.arc(center.x,center.y,radius,Math.PI*4/3,Math.PI*5/3);
			c.lineTo(center.x,center.y);
			c.fill();
			c.stroke();
		}

		u.drawShadow = function(c,center,radius) {
			c.beginPath();
			c.moveTo(center.x-radius/4,center.y);
			c.lineTo(center.x,center.y-radius/10);
			c.lineTo(center.x+radius/4,center.y);
			c.lineTo(center.x,center.y+radius/10);
			c.lineTo(center.x-radius/4,center.y);
			c.fill();
		}

		u.drawTrack = function(c,center,data) {
			if (!data || data.length < 2) return;
			c.beginPath();
			for (var i = 0; i < data.length; i++) {
				if (data[i].dt == null) continue;
				var p = self.canvasOverlay.abs2rel(data[i],self.zoom());
				if (i > 0) c.lineTo(p.x,p.y);
				else c.moveTo(p.x,p.y);
			}
			c.lineTo(center.x,center.y);
			c.stroke();
		}

		u.render = function() {
			if (u.noData() || !u.visible()) return;

			var coords = self.prepareCoords(u.position().lat,u.position().lng);
			var p = self.canvasOverlay.abs2rel(coords,self.zoom());

			var iconSize = config.canvas.ufosSizes[self.modelsVisualMode()] || config.canvas.ufosSizes["default"];
			var iconColor = config.canvas.ufosColors[u.state()] || config.canvas.ufosColors["default"];

			if (self.canvasOverlay.inViewport(p,iconSize)) {
				var context = self.canvasOverlay.getContext();

				context.fillStyle = config.canvas.ufosProperties.shadowStyle;
				u.drawShadow(context,p,iconSize);

				if (self.tracksVisualMode() != "off" && u.trackData.length > 1) {
					context.strokeStyle = u.color();
					u.drawTrack(context,p,u.trackData);
					context.strokeStyle = config.canvas.ufosProperties.strokeStyle;
				}

				context.fillStyle = iconColor;
				u.drawIcon(context,p,iconSize);

				if (self.namesVisualMode() == "on" || (self.namesVisualMode() == "auto" && self.zoom() >= config.namesVisualModeAutoMinZoom)) {
					context.fillStyle = u.color();
					context.fillText(u.name(),p.x,p.y);
				}

			}
		}

		u.trackSubscribe = u.track.subscribe(function(v) {
			if (!u.visible() || self.tracksVisualMode() == "off") return;
			// если приходит специальное значение v.dt=null, обнуляем трек
			if (v.dt == "null") {
				u.trackData = [];
				return;
			}

			// подготавливаем координаты и добавляем новую точку в trackData
			var coords = self.prepareCoords(v.lat,v.lng);
			v.x = coords.x;
			v.y = coords.y;
			u.trackData.push(v);

			// если 10 минут ограничение трека, убираем из начала трека старые точки
			if (self.tracksVisualMode() == "10min") {
				while (u.trackData[0] && (self.currentKey() > u.trackData[0].dt + 60000))
					u.trackData.splice(0,1);
			}
		});

		return u;
	}

	GoogleMap.prototype.destroyUfo = function(u) {
	}

	GoogleMap.prototype.createShortWay = function(data) {
		var self = this;
		if (!data) return;

		var w = {};
/*
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
*/
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

	GoogleMap.prototype.calculateAndSetDefaultPosition = function() {
		if (!this.map || !this.shortWay()) return;
		var bounds = new gmaps.LatLngBounds();
		for (var i = 0, l = this.shortWay().length; i < l; i++) {
			w = this.shortWay()[i];
			bounds.extend(new gmaps.LatLng(w.lat,w.lng));
		}
		this.map.fitBounds(bounds);
		// Допиливание неточностей fitBounds, в большинстве случаев зум можно увеличить на 1 и все равно все помещается
		if (!this.map.getProjection || !this.map.getProjection()) return;
		var boundsNE = this.map.getProjection().fromLatLngToPoint(bounds.getNorthEast());
		var boundsSW = this.map.getProjection().fromLatLngToPoint(bounds.getSouthWest());
		var boundsH = Math.abs(boundsNE.y-boundsSW.y);
		var boundsW = Math.abs(boundsNE.x-boundsSW.x);
		var b = this.map.getBounds();
		var bNE = this.map.getProjection().fromLatLngToPoint(b.getNorthEast());
		var bSW = this.map.getProjection().fromLatLngToPoint(b.getSouthWest());
		var bH = Math.abs(bNE.y-bSW.y);
		var bW = Math.abs(bNE.x-bSW.x);
		if (boundsH*2<bH && boundsW*2<bW)
			this.map.setZoom(this.map.getZoom()+1);
	}

	GoogleMap.prototype.updateCanvas = function() {
		if (!this.canvasOverlay) return;
		this.canvasOverlay.clear();
		this.canvasOverlay.setProperties(config.canvas.ufosProperties);
		this.mapUfos.forEach(function(ufo) {
			ufo.render();
		});
	}

	GoogleMap.prototype.updateCanvasRun = function(force) {
		var self = this;
		if (!force && this._updatingCanvas) {
			this._updateCanvasRequired = true;
			return;
		}
		this._updatingCanvas = true;
		this._updateCanvasRequired = false;
		clearTimeout(this._updatingCanvasTimeout);

		this.updateCanvas();

		this._updatingCanvasTimeout = setTimeout(function() {
			self._updatingCanvas = false;
			if (self._updateCanvasRequired)
				self.updateCanvasRun();
		},50);
	}

	GoogleMap.prototype.update = function() {
		this.updateCanvasRun();
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
//		gmaps.event.addListener(this.map,"mousedown",function() {
//			self.activateMapScroll(true);
//		});
//		gmaps.event.addListener(this.map,"click",function() {
//			self.activateMapScroll(true);
//		});

		this.canvasOverlay = new CanvasOverlay({
			map: this.map
		});

		gmaps.event.addListener(this.map,"center_changed",function() {
			// событие center_changed возникает когда меняется размер карты (так же поступает bounds_changed, но он с глючной задержкой)
			self.canvasOverlay.relayout();
			self.updateCanvasRun(true);
		});
		gmaps.event.addListener(this.map,"zoom_changed",function() {
			self.zoom(self.map.getZoom());
			self.updateCanvasRun(true);
		});

		this.isReady(true);
		this.mapOptions.valueHasMutated();
	}
	
	GoogleMap.prototype.domDestroy = function(elem,params) {
		delete this.map;
	}

	GoogleMap.prototype.templates = ["main"];

	return GoogleMap;
});
