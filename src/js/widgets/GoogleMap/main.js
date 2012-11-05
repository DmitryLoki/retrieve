define(['knockout', 'google.maps', 'utils', 'EventEmitter'], function(ko, gmaps, utils, EventEmitter){
	// params: { map: null, template: '<div data-bind="..."></div>', data: {...} }
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
	
	// coords: new gmap.LatLng()
	MapFloatElem.prototype.move = function(coords){
		this._coords = coords;
		this.draw();
	};

	//---------------------------------------------------------------------
	// params: {
	//  map: this._map,
	//  hintTitleHide: true,
	//  title: params.title,
	//  color: params.color,
	//  titleTemplate: this.templates.markerTitle }
//	var Ufo = function(map, params){
	var Ufo = function(params){
		this._map = params.map;
		this._params = params;
		
		this._track = new gmaps.Polyline({
			strokeColor: params.color,
			strokeOpacity: 1,
			strokeWeight: 1
		});
		this._path = this._track.getPath();
		this._pathTime = [];
		this._marker = new gmaps.Marker({
			flat: true,
			title: params.title,
			map: params.map
		});
		this._titleElem = new MapFloatElem({
			template: params.titleTemplate,
			data: {
				title: params.title,
				color: params.color
			}
		});
		
		this._hintTitleHide = params.hintTitleHide;
	};
	
	utils.extend(Ufo.prototype, EventEmitter.prototype);
	
	Ufo.prototype.icon = function(params){
		this._marker.setIcon(new gmaps.MarkerImage(params.url, new gmaps.Size(params.width, params.height), new gmaps.Point(0,0), new gmaps.Point(params.x, params.y)));
		return this;
	};
	
	Ufo.prototype._visibilityUpdate = function(){
		this._track.setMap(this._visible && this._trackVisible ? this._params.map : null);
		this._marker.setMap(this._visible ? this._params.map : null);
		this._titleElem.setMap(this._visible && this._titleVisible && !this._hintTitleHide ? this._params.map : null);
	};
	
	Ufo.prototype.move = function(coords){
		if(this._coords && this._coords.lat == coords.lat && this._coords.lng == coords.lat)
			return;
		
		var latLng = new gmaps.LatLng(coords.lat, coords.lng);
		this._coords = latLng;
		
		this._path.push(latLng);
		this._pathTime.push(coords.time);
		if(this._path.getLength() > 2000){
			this._path.removeAt(0);
			this._pathTime.splice(0, 1);
		}
		this._marker.setPosition(latLng);
		this._titleElem.move(latLng);
		return this;
	};

	Ufo.prototype.trackFilter = function(time){
		var self = this;
		var delNum = 0;
		this._pathTime.every(function(item){
			var deleted = item <= time;
			if(deleted){
				delNum ++;
				self._path.removeAt(0);
			}
			return deleted;
		});
		if(delNum)
			self._pathTime.splice(0, delNum);
	};

	Ufo.prototype.visible = function(flag){
		if(this._visible != flag){
			this._visible = flag;
			this._visibilityUpdate();
		}
		return this;
	};
	
	Ufo.prototype.trackVisible = function(flag){
		if(this._trackVisible != flag){
			this._trackVisible = flag;
			this._visibilityUpdate();
		}
		return this;
	};
	
	Ufo.prototype.titleVisible = function(flag){
		if(this._titleVisible != flag){
			this._titleVisible = flag;
			this._visibilityUpdate();
		}
		return this;
	};

	Ufo.prototype.hintTitleHide = function(flag){
		if(this._hintTitleHide != flag){
			this._hintTitleHide = flag;
			this._visibilityUpdate();
		}
		return this;
	};

	Ufo.prototype.destroy = function(flag){
		this._track.setMap(null);
		this._titleElem.setMap(null);
		this._marker.setMap(null);
		this.emit('destroy');
	};

	//---------------------------------------------------------------------
	// params: {lat: 0, lng: 0, radius: 1000, type: 'start'/'finish'/'waypoint'}
	var Waypoint = function(map, params){
		this._params = params;
		
		var coords = new gmaps.LatLng(params.lat, params.lng);
		var color;
		switch(params.type){
		case 'start':
			color = '#FF0000';
			break;
		case 'waypoint':
			color = '#00FF00';
			break;
		case 'finish':
			color = '#0000FF';
			break;
		default:
			throw new Error('GoogleMap: type of waypoint is invalid!');
		}
		var circle = new gmaps.Circle({
			strokeColor: color,
			strokeOpacity: 0.8,
			strokeWeight: 1,
			fillColor: color,
			fillOpacity: 0.2,
			map: map,
			center: coords,
			radius: params.radius
		});
		
		this.circleBounds = circle.getBounds();
		
		this._titleElem = new MapFloatElem({
			template: params.titleTemplate,
			data: {
				title: params.title,
				color: color
			}
		});
		this._titleElem.setMap(map);
		
		this._titleElem.move(this.circleBounds.getNorthEast());
	};

	//---------------------------------------------------------------------
	var GoogleMap = function(){
		this.width = ko.observable('320px');
		this.height = ko.observable('240px');

		var self = this;
		function updateSize(){
			if(self.map)
				gmaps.event.trigger(self.map, 'resize');
		}
		this.width.subscribe(updateSize);
		this.height.subscribe(updateSize);
		
		this._ufos = [];
		this._titlesHideByZoom = true;
	};

	GoogleMap.prototype.domInit = function(elem, params){
		params.width && this.width(params.width);
		params.height && this.height(params.height);

		var div = ko.virtualElements.firstChild(elem);
		while(div && div.nodeType != 1)
			div = ko.virtualElements.nextSibling(div);
		ko.virtualElements.prepend(elem, div);
		
		this._map = new gmaps.Map(div, {
			zoom: 8,
			center: new gmaps.LatLng(55.748758, 37.6174),
			mapTypeId: gmaps.MapTypeId.TERRAIN
		});

		gmaps.event.addListener(this._map, 'zoom_changed', this._zoomedUpdate.bind(this));
		this._zoomedUpdate();
	};
	
	GoogleMap.prototype._zoomedUpdate = function(){
		this._zoomed = this._map.getZoom() > 11;
		this._hintsUpdate();
	};
	
	GoogleMap.prototype._hintsUpdate = function(){
		var flag = this._titlesHideByZoom && !this._zoomed;
		if(this._hintsUpdateFlag != flag){
			this._hintsUpdateFlag = flag;
			var self = this;
			this._ufos.forEach(function(ufo){
				ufo.hintTitleHide(self._titlesHideByZoom && !self._zoomed);
			});
		}
	};
	
	GoogleMap.prototype.titlesHideByZoom = function(flag){
		this._titlesHideByZoom = flag;
		this._hintsUpdate();
	};
	
	GoogleMap.prototype.domDestroy = function(elem, params){
		delete this._map;
	};

	// after domInit
	// waypoints: [{ lat: 0.0, lng: 0.0, radius: 300, title: 'title', type: 'start/end/normal'}, {...}, ...]
	GoogleMap.prototype.waypoints = function(waypoints){
		var self = this;
		var track = new gmaps.Polyline({
			strokeColor: "#FF0000",
			strokeWeight: 1,
			map: this._map,
			strokeOpacity: 0,
			icons: [{
				icon: {
					path: 'M 0,-1 0,1',
					strokeOpacity: 0.8,
					strokeWeight: 2
				},
				offset: '0',
				repeat: '6px'
			}],
		});
		var path = track.getPath();
		var centered = false;
		this._waypoints = [];
		var bounds = new gmaps.LatLngBounds();
		waypoints.forEach(function(wpParams){
			var coords = new gmaps.LatLng(wpParams.lat, wpParams.lng);
			if(!centered){
				self._map.setCenter(coords);
				centered = true;
			}
			var params = wpParams;
			params.titleTemplate = self.templates.waypointTitle;
			var wp = new Waypoint(self._map, params);
			bounds = bounds.union(wp.circleBounds);
			self._waypoints.push(wp);
			path.push(coords);
		});
		this._map.fitBounds(bounds);
	};
	
	// after domInit
	// params: { map: this, title: 'boo boo', color: "#7B52C9" }
	GoogleMap.prototype.ufo = function(params){
		var ufo = new Ufo({
			map: this._map,
			title: params.title,
			color: params.color
		},{});
		this._ufos.push(ufo);
		var self = this;
		ufo.on('destroy', function(){
			self._ufos.splice(self._ufos.indexOf(ufo), 1);
		});
		return ufo;
	};

	GoogleMap.prototype.templates = ['main', 'markerTitle', 'waypointTitle'];

	return GoogleMap;
});
