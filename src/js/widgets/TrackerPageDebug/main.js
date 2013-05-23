define([
    'utils',
    'walk',
    'knockout',
    'knockout.mapping',
    'EventEmitter',
    'WindowManager',
    'widget!GoogleMap',
    'widget!PlayerControl',
    'widget!UfosTable',
    'widget!Checkbox',
    'widget!Window',
    'widget!OwgMap',
    'widget!MainMenu',
    'widget!TopBar',
    'TestServer',
    'RealServer',
    'DataSource',
    'ShortWay',
    'config'
], function(
	utils,
	walk,
	ko,
	komap,
	EventEmitter,
	WindowManager,
	GoogleMap,
	PlayerControl,
	UfosTable,
    Checkbox,
    Window,
    OwgMap,
    MainMenu,
    TopBar,
    TestServer,
    RealServer,
    DataSource,
    ShortWay,
    config
){

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

	var Waypoint = function(options) {
		this.id = ko.observable(options.id);
		this.name = ko.observable(options.name);
		this.type = ko.observable(options.type);
		this.center = ko.observable({lat:options.center.lat,lng:options.center.lng});
		this.radius = ko.observable(options.radius);
		this.openKey = ko.observable(options.openKey);
	}

	var Ufo = function(options) {
		this.id = ko.observable(options.id);
		this.name = ko.observable(options.name);
		this.country = ko.observable(options.country);
		this.color = ko.observable(options.color || config.ufo.color);
		this.state = ko.observable(null);
		this.stateChangedAt = ko.observable(null);
		this.position = ko.observable({lat:null,lng:null,dt:null});
		this.track = ko.observable({lat:null,lng:null,dt:null});
		this.alt = ko.observable(null);
		this.dist = ko.observable(null);
		this.gSpd = ko.observable(null);
		this.vSpd = ko.observable(null);
		this.visible = ko.observable(config.ufo.visible);
		this.trackVisible = ko.observable(config.ufo.trackVisible);
		this.noData = ko.observable(true);
		this.tableData = {
			dist: ko.observable(null),
			gSpd: ko.observable(null),
			vSpd: ko.observable(null),
			alt: ko.observable(null),
			state: ko.observable(null),
			stateChangedAt: ko.observable(null)
		}
	}

	Ufo.prototype.updateTableData = function() {
		this.tableData.dist((this.dist()/1000).toFixed(1));
		this.tableData.gSpd(this.gSpd());
		this.tableData.vSpd(this.vSpd());
		this.tableData.alt(this.alt());
		this.tableData.state(this.state());
		this.tableData.stateChangedAt(this.stateChangedAt());
	}

	Ufo.prototype.resetTrack = function() {
		// dt=null - специальное значение. Карта его отслеживает и убивает у себя трек при dt=null
		this.track({lat:null,lng:null,dt:null});
	}

	var TrackerPageDebug = function() { 
		var self = this;
		this.options = config;
		this.width = ko.observable(this.options.width);
		this.height = ko.observable(this.options.height);
		this.imgRootUrl = ko.observable(this.options.imgRootUrl);
		this.mapWidget = ko.observable(this.options.mapWidget);
		this.mapOptions = ko.observable(this.options.mapOptions);
		this.mode = ko.observable(this.options.mode);
		this.tracksVisualMode = ko.observable(this.options.tracksVisualMode);
		this.cylindersVisualMode = ko.observable(this.options.cylindersVisualMode);
		this.modelsVisualMode = ko.observable(this.options.modelsVisualMode);
		this.shortWayVisualMode = ko.observable(this.options.shortWayVisualMode);
		this.namesVisualMode = ko.observable(this.options.namesVisualMode);
		this.startKey = ko.observable(0);
		this.endKey = ko.observable(0);
		this.currentKey = ko.observable(0);
		this.raceKey = ko.observable(0);
		this.playerState = ko.observable(this.options.playerState);
		this.playerSpeed = ko.observable(this.options.playerSpeed);
		this.isReady = ko.observable(false);
		this.isOnline = ko.observable(false);

		this.ufos = ko.observableArray();
		this.waypoints = ko.observableArray();
		this.shortWay = ko.observable(null);

		this.shortWayInitializer = ko.computed(function() {
			if (self.isReady() && self.waypoints && self.waypoints().length > 0) {
				var shortWayCalculator = new ShortWay();
				var data = [];
				for (var i = 0; i < self.waypoints().length; i++) {
					var w = self.waypoints()[i];
					data.push({
						lat: w.center().lat,
						lng: w.center().lng,
						radius: w.radius(),
						id: w.id()
					});
				}
				self.shortWay(shortWayCalculator.calculate(data));
			}
			else {
				self.shortWay(null);
			}
		});

		this.mapInitializer = ko.computed(function() {
			if (self.isReady()) {
				if (self.map)
					self.map.destroy();
				if (self.mapWidget() == "2d") {
					self.map = new GoogleMap({
						ufos: self.ufos,
						waypoints: self.waypoints,
						shortWay: self.shortWay,
						tracksVisualMode: self.tracksVisualMode,
						cylindersVisualMode: self.cylindersVisualMode,
						modelsVisualMode: self.modelsVisualMode,
						shortWayVisualMode: self.shortWayVisualMode,
						namesVisualMode: self.namesVisualMode,
						currentKey: self.currentKey,
						imgRootUrl: self.imgRootUrl,
						mapOptions: self.mapOptions
					});
					self.mapType = "GoogleMap";
				}
				else if (self.mapWidget() == "3d") {
					self.map = new OwgMap({
						ufos: self.ufos,
						waypoints: self.waypoints,
						shortWay: self.shortWay,
						tracksVisualMode: self.tracksVisualMode,
						cylindersVisualMode: self.cylindersVisualMode,
						modelsVisualMode: self.modelsVisualMode,
						shortWayVisualMode: self.shortWayVisualMode,
						namesVisualMode: self.namesVisualMode,
						currentKey: self.currentKey,
						imgRootUrl: self.imgRootUrl,
						mapOptions: self.mapOptions
					});
					self.mapType = "OwgMap";
				}
			}
			else {
				self.map = null;
				self.mapType = null;
			}
		});

		this.ufosTable = new UfosTable({
			ufos: this.ufos,
			raceKey: self.raceKey
		});
		this.ufosTableWindow = new Window(this.options.windows.ufosTable);

		this.playerControl = new PlayerControl({
			startKey: self.startKey,
			endKey: self.endKey,
			currentKey: self.currentKey,
			raceKey: self.raceKey,
			tracksVisualMode: self.tracksVisualMode,
			cylindersVisualMode: self.cylindersVisualMode,
			modelsVisualMode: self.modelsVisualMode,
			shortWayVisualMode: self.shortWayVisualMode,
			namesVisualMode: self.namesVisualMode,
			playerState: self.playerState,
			playerSpeed: self.playerSpeed,
			isOnline: self.isOnline
		});
		this.playerControlWindow = new Window(this.options.windows.playerControl);

		this.mainMenu = new MainMenu();
		this.mainMenuWindow = new Window(this.options.windows.mainMenu);

		this.topBar = new TopBar();
		this.topBar.items.push(this.mainMenuWindow,this.ufosTableWindow,this.playerControlWindow);

		this.windowManager = new WindowManager();
		this.windowManager.items.push(this.ufosTableWindow,this.playerControlWindow,this.mainMenuWindow);

//		this.server = new TestServer(this.options);
//		this.server.generateData();
		this.server = new RealServer(this.options);
		this.dataSource = new DataSource({
			server: this.server
		});
	}

	TrackerPageDebug.prototype.domInit = function(elem,params) {
		if (params.contestId)
			this.options.contestId = params.contestId;
		if (params.raceId)
			this.options.raceId = params.raceId;
		if (params.apiVersion)
			this.options.apiVersion = params.apiVersion;
		if (params.imgRootUrl)
			this.options.imgRootUrl = params.imgRootUrl;
		if (params.width)
			this.options.width = params.width;
		if (params.height)
			this.options.height = params.height;
		if (params.mode)
			this.options.mode = params.mode;
		if (params.mapWidget)
			this.options.mapWidget = params.mapWidget;
		if (params.mapOptions)
			this.options.mapOptions = params.mapOptions;
		this.rebuild();
		if (params.callback)
			params.callback(this);
		this.emit("domInit");
	}

	TrackerPageDebug.prototype.setOption = function(p,v) {
		this.options[p] = v;
	}

	TrackerPageDebug.prototype.rebuild = function() {
		var self = this;
		self.clear();
		self.width(self.options.width);
		self.height(self.options.height);
		self.imgRootUrl(self.options.imgRootUrl);
		self.mode(self.options.mode);
		self.mapWidget(self.options.mapWidget);
		self.mapOptions(self.options.mapOptions);
		self.isReady(!!self.options.raceId);
		if (self.isReady()) {
			self.loadRaceData(function(raceData) {
				if (self.mode() == "full") {
					self.loadUfosData(function() {
						self.playerInit();
						self.emit("loaded",raceData);
					});
				}
				else
					self.emit("loaded",raceData);
			});
		}
	}

	TrackerPageDebug.prototype.clear = function() {
		this.ufos([]);
		this.waypoints([]);
	}

	TrackerPageDebug.prototype.loadRaceData = function(callback) {
		var self = this;
		this.dataSource.get({
			type: "race",
			callback: function(data) {
				self.startKey(data.startKey);
				self.endKey(data.endKey);
				self.currentKey(data.startKey);
				self.raceKey(data.raceKey||data.startKey);
				if (self.mainMenu && data.titles)
					self.mainMenu.setTitles(data.titles);
				var waypoints2load = [];
				if (data.waypoints) {
					for (var i = 0; i < data.waypoints.length; i++) {
						var w = new Waypoint(data.waypoints[i]);
						waypoints2load.push(w);
					}
				}
				self.waypoints(waypoints2load);
				if (self.map)
					self.map.calculateAndSetDefaultPosition();
				if (callback && typeof callback == "function")
					callback(data);
			},
			error: function(jqXHR,textStatus,errorThrown) {
				self.emit("loadingError");
			}
		});
	}

	TrackerPageDebug.prototype.loadUfosData = function(callback) {
		var self = this;
		var loadedUfos = 0;
		self.dataSource.get({
			type: "ufos",
			callback: function(ufos) {
				var ufos2load = [];
				if (ufos) {
					for (var i = 0; i < ufos.length; i++) {
						var w = new Ufo(ufos[i]);
						ufos2load.push(w);
					}
				}
				self.ufos(ufos2load);
				if (callback && typeof callback == "function")
					callback();
			},
			error: function(jqXHR,textStatus,errorThrown) {
				self.emit("loadingError");
			}
		});
	}

	TrackerPageDebug.prototype.playerInit = function() {
		var self = this;
		var renderFrame = function(callback) {
			self.dataSource.get({
				type: "timeline",
				dt: self.currentKey(),
				timeMultiplier: self.playerSpeed(),
				dtStart: self.startKey(),
				callback: function(data) {
					// в data ожидается массив с ключами - id-шниками пилотов и данными - {lat и lng} - текущее положение
					self.ufos().forEach(function(ufo) {
						if (data && data[ufo.id()]) {
							rw = data[ufo.id()];
							ufo.alt(rw.alt);
							ufo.dist(rw.dist);
							ufo.gSpd(rw.gspd);
							ufo.vSpd(rw.vspd);
							ufo.noData(false);
							if (!ufo.position() || 
								!ufo.position().lat || 
								!ufo.position().lng ||
								Math.abs(rw.position.lat-ufo.position().lat) > 0.0000001 ||
								Math.abs(rw.position.lng-ufo.position().lng) > 0.0000001) 
								ufo.position({lat:rw.position.lat,lng:rw.position.lng,dt:rw.position.dt});
							if (!ufo.track() || !ufo.track().dt || ufo.track().dt != rw.track.dt)
								ufo.track({lat:rw.track.lat,lng:rw.track.lng,dt:rw.track.dt});
							if (rw.state)
								ufo.state(rw.state);
							if (rw.stateChangedAt)
								ufo.stateChangedAt(rw.stateChangedAt);
						}
						else
							ufo.noData(true);
					});
					if (callback)
						callback(data);
				}
			});
		}

		var run = function(callback) {
			renderFrame(function() {
				if (self.playerState() == "play") {
					dt = (new Date).getTime();
					requestAnimFrame(function() {
						var t = (new Date).getTime();
						var key = self.currentKey()+(t-dt)*self.playerSpeed();
						if (key > self.endKey()) {
							key = self.endKey();
							self.playerState("pause");
						}
						self.currentKey(key);
						run();
					});
				}
				if (callback && typeof callback == "function")
					callback();
			});
		}

		var resetUfosTracks = function() {
			self.ufos().forEach(function(ufo) {
				ufo.resetTrack();
			});
		}

		var tableTimerHandle = null;
		var updateTableData = function() {
			self.ufos().forEach(function(ufo) {
				ufo.updateTableData();
			});
			self.ufosTable.sortTableRows();
		}
		var runTableData = function() {
			updateTableData();
			if (self.playerState() == "play") {
				if (tableTimerHandle)
					clearTimeout(tableTimerHandle);
				tableTimerHandle = setTimeout(runTableData,self.options.renderTableDataInterval);
			}
		}

		self.playerControl.on("change",function(v) {
			self.currentKey(v);
			resetUfosTracks();
			run(runTableData);
		});

		self.playerState.subscribe(function(state) {
			if (state == "play") {
				run(runTableData);
			}
		});

		run(runTableData);
	}

	TrackerPageDebug.prototype.templates = ["main"];

	return TrackerPageDebug;
});
