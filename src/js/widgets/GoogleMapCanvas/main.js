define(["jquery","knockout","utils","EventEmitter","google.maps","./CanvasOverlay","config"],function($,ko,utils,EventEmitter,gmaps,CanvasOverlay,config) {

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
			self.destroyShortWay(self.mapShortWay);
			self.mapShortWay = self.createShortWay(w);
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
			shortWay: data.shortWay
		}

		w.spherePoint = ko.computed(function() {
			if (!w.center() || !w.radius()) return null;
			var rp = gmaps.geometry.spherical.computeOffset(new gmaps.LatLng(w.center().lat,w.center().lng),w.radius(),90);
			return self.map.getProjection().fromLatLngToPoint(rp);
		});

		w.state = ko.computed(function() {
			if (self.mode() == "simple") return "opened";
			return w.openKey() < self.currentKey() ? "opened" : "closed";
		});

		w.state.subscribe(function() {
			self.update("static");
		});

		w.render = function(co) {
			if (self.cylindersVisualMode() == "off") return;

			var coords = self.prepareCoords(w.center().lat,w.center().lng);
			var p = co.abs2rel(coords,self.zoom());
			var sp = co.abs2rel(w.spherePoint(),self.zoom());
			var r = Math.sqrt(Math.pow(p.x-sp.x,2)+Math.pow(p.y-sp.y,2));

			if (co.inViewport(p,r)) {
				var context = co.getContext();
				var color = config.canvas.waypoints.colors[w.type()] ? config.canvas.waypoints.colors[w.type()][w.state()] : config.canvas.waypoints.colors["default"][w.state()];
				co.setProperties($.extend({},config.canvas.waypoints.basic,{fillStyle:color}));
				context.beginPath();
				context.arc(p.x,p.y,r,0,2*Math.PI);
				context.stroke();
				if (self.cylindersVisualMode() == "full")
					context.fill();
			}


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

		u.render = function(co) {
			if (u.noData() || !u.visible()) return;

			var p = co.abs2rel(u.coords(),self.zoom());

			var iconSize = config.canvas.ufos.sizes[self.modelsVisualMode()] || config.canvas.ufos.sizes["default"];
			var iconColor = config.canvas.ufos.colors[u.state()] || config.canvas.ufos.colors["default"];

			if (co.inViewport(p,iconSize)) {
				var context = co.getContext();
				// Тень от иконки
				co.setProperties($.extend({},config.canvas.ufos.basic,config.canvas.ufos.shadow));
				context.beginPath();
				context.moveTo(p.x-iconSize/4,p.y);
				context.lineTo(p.x,p.y-iconSize/10);
				context.lineTo(p.x+iconSize/4,p.y);
				context.lineTo(p.x,p.y+iconSize/10);
				context.lineTo(p.x-iconSize/4,p.y);
				context.fill();
				// Трек
				if (self.tracksVisualMode() != "off" && u.trackData.length > 1) {
					co.setProperties($.extend({},config.canvas.ufos.basic,{strokeStyle:u.color()}));
					context.beginPath();
					for (var i = 0; i < u.trackData.length; i++) {
						if (u.trackData[i].dt == null) continue;
						var pp = co.abs2rel(u.trackData[i],self.zoom());
						if (i > 0) context.lineTo(pp.x,pp.y);
						else context.moveTo(pp.x,pp.y);
					}
					context.lineTo(p.x,p.y);
					context.stroke();
				}
				// Имя пилота
				if (self.namesVisualMode() == "on" || (self.namesVisualMode() == "auto" && self.zoom() >= config.namesVisualModeAutoMinZoom)) {
					co.setProperties($.extend({},config.canvas.ufos.basic,config.canvas.ufos.titles));
					context.strokeText(u.name(),p.x,p.y);
					context.fillText(u.name(),p.x,p.y);
				}
				// Иконка
				co.setProperties($.extend({},config.canvas.ufos.basic,{fillStyle:iconColor}));
				context.beginPath();
				context.moveTo(p.x,p.y);
				context.arc(p.x,p.y,iconSize,Math.PI*4/3,Math.PI*5/3);
				context.lineTo(p.x,p.y);
				context.fill();
				context.stroke();
			}
		}

		u.coords = ko.computed(function() {
			if (u.noData() || !u.visible() || !u.position()) return null;
			return self.prepareCoords(u.position().lat,u.position().lng);
		});

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
		u.trackSubscribe.dispose();
	}

	GoogleMap.prototype.createShortWay = function(data) {
		var self = this;
		if (!data) return null;

		for (var i = 0; i < data.length; i++) {
			var p = self.prepareCoords(data[i].lat,data[i].lng);
			data[i].x = p.x;
			data[i].y = p.y;
		}

		var w = {
			data:data
		};

		w.render = function(co) {
			co.setProperties(config.canvas.shortWay.basic);
			var context = co.getContext();
			context.beginPath();
			var prevP = null;
			for (var i = 0; i < w.data.length; i++) {
				var p = co.abs2rel(w.data[i],self.zoom());
				if (i > 0) {
					context.lineTo(p.x,p.y);
					var l = Math.sqrt(Math.pow(p.x-prevP.x,2)+Math.pow(p.y-prevP.y,2));
					if (l > config.canvas.shortWay.arrowSize/2) {
						
					}
				}
				else
					context.moveTo(p.x,p.y);
				prevP = p;
			}
			context.stroke();

		}
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
//		this.refreshShortWayArrows();
		return w;
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

	GoogleMap.prototype._updateDynamicCanvas = function(canvas) {
		this.mapUfos.forEach(function(ufo) {
			ufo.render(canvas);
		},this);
	}

	GoogleMap.prototype._updateStaticCanvas = function(canvas) {
		this.mapWaypoints.forEach(function(waypoint) {
			waypoint.render(canvas);
		},this);
		if (this.mapShortWay)
			this.mapShortWay.render(canvas);
	}

	GoogleMap.prototype.update = function(type,force) {
		var self = this;
		var canvas = type=="static" ? this.staticCanvasOverlay : this.canvasOverlay;
		if (!canvas) return;
		if (!force && canvas._updating) {
			canvas._updateRequired = true;
			return;
		}
		canvas._updating = true;
		canvas._updateRequired = false;
		clearTimeout(canvas._updatingTimeout);

		canvas.clear();
		if (type=="static") this._updateStaticCanvas(canvas);
		else this._updateDynamicCanvas(canvas);

		canvas._updatingTimeout = setTimeout(function() {
			canvas._updating = false;
			if (canvas._updateRequired)
				self.update(type);
		});
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
		gmaps.event.addListenerOnce(this.map,"mousedown",function() {
			self.activateMapScroll(true);
		});
		gmaps.event.addListenerOnce(this.map,"click",function() {
			self.activateMapScroll(true);
		});

		this.staticCanvasOverlay = new CanvasOverlay({
			map: this.map,
			container: gmaps.ControlPosition.TOP_CENTER
		});

		this.canvasOverlay = new CanvasOverlay({
			map: this.map,
			container: gmaps.ControlPosition.BOTTOM_CENTER
		});

		gmaps.event.addListener(this.map,"center_changed",function() {
			// событие center_changed возникает когда меняется размер карты (так же поступает bounds_changed, но он с глючной задержкой)
			self.staticCanvasOverlay.relayout();
			self.canvasOverlay.relayout();
			self.update("static",true);
			self.update("dynamic",true);
		});
		gmaps.event.addListener(this.map,"zoom_changed",function() {
			self.zoom(self.map.getZoom());
			self.update("static",true);
			self.update("dynamic",true);
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
