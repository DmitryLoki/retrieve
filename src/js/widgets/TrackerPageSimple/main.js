define([
    'utils',
    'knockout',
    'EventEmitter',
    'widget!GoogleMap',
    'TestServer',
    'RealServer',
    'DataSource',
    'ShortWay'
], function(
	utils,
	ko,
	EventEmitter,
	GoogleMap,
    TestServer,
    RealServer,
    DataSource,
    ShortWay
){

	var TrackerPageDebug = function() { 
		this.initialize();
	}

	TrackerPageDebug.prototype.options = {
		cylindersVisualMode: "full",
		shortWayVisualMode: "wide",
		shortWayWide: {
			color: "#336699",
			strokeOpacity: 0.5,
			strokeWeight: 5
		},
		shortWayThin: {
			color: "#336699",
			strokeOpacity: 1,
			strokeWeight: 2
		},
		waypointsColors: {
			to: {
				closed: "#ff0000",
				opened: "#00ff00"
			},
			waypoint: {
				closed: "#909090",
				opened: "#909090"
			},
			goal: {
				closed: "#0000ff",
				opened: "#0000ff"
			}
		}
	}

	TrackerPageDebug.prototype.initialize = function() {
		var self = this;

		this.width = ko.observable(0);
		this.height = ko.observable(0);

		this.waypoints = ko.observableArray();
		this.map = new GoogleMap(this.options);
		this.mapType = "GoogleMap";
		this.server = new RealServer(this.options);

		this.dataSource = new DataSource({
			server: this.server
		});

		this.map.cylindersVisualMode(this.options.cylindersVisualMode);
		this.map.shortWayVisualMode(this.options.shortWayVisualMode);
	}

	TrackerPageDebug.prototype.loadWaypoints = function(data,callback) {
		this.waypoints([]);
		if (this.map && data.waypoints) {
			for (var i = 0; i < data.waypoints.length; i++)
				this.waypoints.push(this.map.waypoint(data.waypoints[i]));
		}
		if (callback)
			callback();
	}

	TrackerPageDebug.prototype.loadShortWay = function(data,callback) {
		// Рисуем оптимальный путь
		if (this.map && data.waypoints) {
			var shortWay = new ShortWay();
			this.map.setShortWay({data:shortWay.calculate(data.waypoints),options:{wide:this.options.shortWayWide,thin:this.options.shortWayThin}});
		}
		if (callback)
			callback();
	}

	TrackerPageDebug.prototype.setMapPosition = function(data) {
		if (this.map && data.center) {
			this.map.calculateAndSetDefaultPosition();
		}
	}

	TrackerPageDebug.prototype.clearMap = function() {
		if (this.map) {
			this.map.clearWaypoints();
			this.map.clearShortWay();
			this.map.clearUfos();
		}
	}

	TrackerPageDebug.prototype.domInit = function(elem, params) {
		this.options.contestId = params.contestId;
		this.options.raceId = params.raceId;
		this.options.width = params.width;
		this.options.height = params.height;
		this.rebuild();
		if (params.callback)
			params.callback(this);
		this.emit("domInit");
	}

	TrackerPageDebug.prototype.rebuild = function() {
		var self = this;
		this.width(this.options.width);
		this.height(this.options.height);
		this.clearMap();
		this.dataSource.get({
			type: "race",
			callback: function(data) {
				self.loadWaypoints(data);
				self.loadShortWay(data);
				self.setMapPosition(data);
				self.emit("loaded", data);
			},
			error: function(jqXHR,textStatus,errorThrown) {
				self.emit("loadingError");
			}
		});
	}

	TrackerPageDebug.prototype.setOption = function(p,v) {
		this.options[p] = v;
	}

	TrackerPageDebug.prototype.templates = ["main"];

	return TrackerPageDebug;
});