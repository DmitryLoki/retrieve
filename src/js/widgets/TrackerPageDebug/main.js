define([
    'utils',
    'walk',
    'jquery',
    'knockout',
    'knockout.mapping',
    'EventEmitter',
    'WindowManager',
    'widget!GoogleMap',
    'widget!GoogleMapCanvas',
    'widget!PlayerControl',
    'widget!UfosTable',
    'widget!RetrieveTable',
    'widget!RetrieveRawForm',
    'widget!RetrieveChat',
    'widget!Checkbox',
    'widget!Window',
    'widget!MainMenu',
    'widget!TopBar',
    'widget!Facebook',
    'widget!RetrieveDistanceMeasurer',
    'TestServer',
    'RealServer',
    'DataSource',
    'ShortWay',
    'config'
], function(
	utils,
	walk,
	$,
	ko,
	komap,
	EventEmitter,
	WindowManager,
	GoogleMap,
	GoogleMapCanvas,
	PlayerControl,
	UfosTable,
	RetrieveTable,
	RetrieveRawForm,
	RetrieveChat,
    Checkbox,
    Window,
    MainMenu,
    TopBar,
    Facebook,
    RetrieveDistanceMeasurer,
    TestServer,
    RealServer,
    DataSource,
    ShortWay,
    config
){

	// requestAnim shim layer by Paul Irish
    var requestAnimFrame = (function() {
//        return 
//			window.requestAnimationFrame       || 
//			window.webkitRequestAnimationFrame || 
//			window.mozRequestAnimationFrame    || 
//			window.oRequestAnimationFrame      || 
//			window.msRequestAnimationFrame     || 
//			function(/* function */ callback, /* DOMElement */ element){
//			  window.setTimeout(callback, 1000 / 60);
//			};
		return function(callback,element) {
			  window.setTimeout(callback,100);
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
		this.personId = ko.observable(options.personId);
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

	var Sms = function(options) {
		this.id = options.id;
		this.from = options.from;
		this.to = options.to;
		this.sender = options.sender;
		this.timestamp = options.timestamp;
		this.body = options.body;
		this.target = options.from == "me" ? options.to : options.from;
		this.readed = ko.observable(false);
		var d = new Date(this.timestamp * 1000);
		this.time = (d.getHours()<10?"0":"") + d.getHours() + ":" + (d.getMinutes()<10?"0":"") + d.getMinutes();
	}

	var TrackerPageDebug = function() { 
		var self = this;
		this.$ = $;
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
		this.profVisualMode = ko.observable(this.options.profVisualMode);
		this.startKey = ko.observable(0);
		this.endKey = ko.observable(0);
		this.currentKey = ko.observable(0);
		this.raceKey = ko.observable(0);
		this.timeoffset = ko.observable("");
		this.playerState = ko.observable(this.options.playerState);
		this.playerSpeed = ko.observable(this.options.playerSpeed);
		this.isReady = ko.observable(false);
		this.isOnline = ko.observable(false);
		this.isCurrentlyOnline = ko.observable(false);
		this.loading = ko.observable(false);

		this.ufos = ko.observableArray();
		this.waypoints = ko.observableArray();
		this.shortWay = ko.observable(null);

		// Йоу! Клевый код!
		this._serverKey = ko.observable(0);
		this._serverKeyUpdatedAt = (new Date).getTime();
		this.serverKey = ko.computed({
			read: function() {
				var d = (new Date).getTime();
				return self._serverKey() + d - self._serverKeyUpdatedAt - config.serverDelay;
			},
			write: function(value) {
				self._serverKey(value);
				self._serverKeyUpdatedAt = (new Date).getTime();
			}
		});

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
				var mapOptions = {
						ufos: self.ufos,
						waypoints: self.waypoints,
						shortWay: self.shortWay,
						tracksVisualMode: self.tracksVisualMode,
						cylindersVisualMode: self.cylindersVisualMode,
						modelsVisualMode: self.modelsVisualMode,
						shortWayVisualMode: self.shortWayVisualMode,
						namesVisualMode: self.namesVisualMode,
						profVisualMode: self.profVisualMode,
						currentKey: self.currentKey,
						raceKey: self.raceKey,
						imgRootUrl: self.imgRootUrl,
						mapOptions: self.mapOptions,
						mode: self.mode
				};
				if (self.mapWidget() == "2d") {
					self.map = new GoogleMap(mapOptions);
					self.mapType = "GoogleMap";
				}
				else if (self.mapWidget() == "2d-canvas") {
					self.map = new GoogleMapCanvas(mapOptions);
					self.mapType = "GoogleMapCanvas";
				}
				else if (self.mapWidget() == "3d") {
					self.map = new OwgMap(mapOptions);
					self.mapType = "OwgMap";
				}
			}
			else {
				self.map = null;
				self.mapType = null;
			}
		});

//		this.server = new TestServer(this.options);
//		this.server.generateData();
		this.server = new RealServer(this.options);
		this.dataSource = new DataSource({
			server: this.server
		});
	}

	TrackerPageDebug.prototype.createWindows = function() {
		var self = this;
		if (this.mode() == "full") {
			this.ufosTable = new UfosTable({
				ufos: this.ufos,
				raceKey: this.raceKey
			});
			this.ufosTableWindow = new Window(this.options.windows.ufosTable);

			this.playerControl = new PlayerControl({
				startKey: this.startKey,
				endKey: this.endKey,
				currentKey: this.currentKey,
				raceKey: this.raceKey,
				serverKey: this.serverKey,
				timeoffset: this.timeoffset,
				tracksVisualMode: this.tracksVisualMode,
				cylindersVisualMode: this.cylindersVisualMode,
				modelsVisualMode: this.modelsVisualMode,
				shortWayVisualMode: this.shortWayVisualMode,
				namesVisualMode: this.namesVisualMode,
				profVisualMode: this.profVisualMode,
				playerState: this.playerState,
				playerSpeed: this.playerSpeed,
				isOnline: this.isOnline,
				isCurrentlyOnline: this.isCurrentlyOnline,
				loading: this.loading
			});
			this.playerControlWindow = new Window(this.options.windows.playerControl);

			this.mainMenu = new MainMenu();
			this.mainMenuWindow = new Window(this.options.windows.mainMenu);

			this.facebook = new Facebook();
			this.facebookWindow = new Window(this.options.windows.facebook);

			this.topBar = new TopBar();
			this.topBar.items.push(this.mainMenuWindow,this.ufosTableWindow,this.playerControlWindow,this.facebookWindow);

			this.windowManager = new WindowManager();
			this.windowManager.items.push(this.ufosTableWindow,this.playerControlWindow,this.mainMenuWindow,this.facebookWindow);
		}
		else if (this.mode() == "retrieve") {
			this.retrieveStatus = ko.observable("");
			this.retrieveState = ko.observable(config.retrieveState);
			this.retrieveSelectedUfo = ko.observable(null);
			this.smsData = ko.observableArray([]);
			this.retrieveTable = new RetrieveTable({
				ufos: this.ufos,
				status: this.retrieveStatus,
				state: this.retrieveState,
				selectedUfo: this.retrieveSelectedUfo,
				smsData: this.smsData
			});
			this.retrieveTableWindow = new Window(this.options.windows.retrieveTable);

			this.retrieveChat = new RetrieveChat({
				ufo: this.retrieveSelectedUfo,
				smsData: this.smsData,
				server: this.server
			});
			this.retrieveChatWindow = new Window(this.options.windows.retrieveChat);

			this.retrieveSelectedUfo.subscribe(function(ufo) {
				if (ufo) self.retrieveChatWindow.show();
			});
			this.retrieveChat.on("newMessage",function() {
				self.retrieveRun();
			});

      this.retrieveDistanceMeasurer = new RetrieveDistanceMeasurer({map:this.map});
      this.retrieveDistanceMeasurerWindow = new Window(this.options.windows.retrieveDistanceMeasurer);
      this.retrieveDistanceMeasurerWindow.on('showed', function(){
        self.retrieveDistanceMeasurer.enable(self.map.map);
      });
      this.retrieveDistanceMeasurerWindow.on('hided', function(){
        self.retrieveDistanceMeasurer.disable();
      });

			this.retrieveRawForm = new RetrieveRawForm({server:this.server});
			this.retrieveRawFormWindow = new Window(this.options.windows.retrieveRawForm);

			this.mainMenu = new MainMenu();
			this.mainMenuWindow = new Window(this.options.windows.mainMenu);

			this.topBar = new TopBar();
			this.topBar.items.push(this.mainMenuWindow,this.retrieveTableWindow,this.retrieveRawFormWindow,this.retrieveDistanceMeasurerWindow);

			this.windowManager = new WindowManager();
			this.windowManager.items.push(this.mainMenuWindow,this.retrieveTableWindow,this.retrieveRawFormWindow,this.retrieveChatWindow,this.retrieveDistanceMeasurerWindow);
		}
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
		if (params.isOnline)
			this.options.isOnline = params.isOnline;
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
		self.mapWidget(self.options.mapWidget);
		self.mapOptions(self.options.mapOptions);
		self.isOnline(self.options.isOnline);

		if (self.isOnline()) self.server.setOption("isOnline",true);

		// Сначала проставляем mode из настроек виджета
		self.mode(self.options.mode);
		// Для данного mode создаем все окна и виджеты
		self.createWindows();
		// Теперь проставляем isReady, и созданные виджеты вставляются в DOM 
		self.isReady(!!self.options.raceId);

		if (self.isReady()) {
			self.loadRaceData(function(raceData) {
				if (self.mode() == "full") {
					self.loadUfosData(function() {
						self.playerInit();
						self.emit("loaded",raceData);
					});
				}
				else if (self.mode() == "retrieve") {
					self.loadUfosData(function() {
						self.retrieveInit();
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
		self.loading(true);
		this.dataSource.get({
			type: "race",
			callback: function(data) {
				self.loading(false);
				self.startKey(data.startKey);
				self.endKey(data.endKey);
				self.currentKey(data.startKey);
				self.raceKey(data.raceKey||data.startKey);
				self.serverKey(data.serverKey);
				self.timeoffset(data.timeoffset);
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
		self.loading(true);
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
				self.loading(false);
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
			self.loading(true);
			self.dataSource.get({
				type: "timeline",
				dt: self.currentKey(),
				timeMultiplier: self.playerSpeed(),
				dtStart: self.startKey(),
				isOnline: self.isOnline(),
				callback: function(data) {
					// в data ожидается массив с ключами - id-шниками пилотов и данными - {lat и lng} - текущее положение
					self.loading(false);
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
								Math.abs(rw.position.lng-ufo.position().lng) > 0.0000001) {
								ufo.position({lat:rw.position.lat,lng:rw.position.lng,dt:rw.position.dt});
							}
							if (!ufo.track() || !ufo.track().dt || ufo.track().dt != rw.track.dt)
								ufo.track({lat:rw.track.lat,lng:rw.track.lng,dt:rw.track.dt});
							if (rw.state && rw.state != ufo.state()) {
								ufo.state(rw.state);
							}
							if (rw.stateChangedAt)
								ufo.stateChangedAt(rw.stateChangedAt);
						}
						else
							ufo.noData(true);
					});
					self.map.update();
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
			if (Math.abs(v-self.serverKey()) < 60000)
				self.isCurrentlyOnline(true);
			else
				self.isCurrentlyOnline(false);
			resetUfosTracks();
			run(runTableData);
		});

		self.playerState.subscribe(function(state) {
			if (state == "play") {
				run(runTableData);
			}
		});

		if (self.isOnline())
			self.playerControl.setLiveMode();
		else
			run(runTableData);
	}

	TrackerPageDebug.prototype.retrieveRun = function() {
		var self = this;
		this.retrieveStatus("Loading...");
		clearTimeout(this.retrieveCounter);
		this.dataSource.get({
			type: "sms",
			lastSmsTimestamp: self.retrieveLastSmsTimestamp,
			callback: function(data) {
				var rev1 = {};
				self.smsData().forEach(function(rw) {
					rev1[rw.id] = 1;
				});
				var sms2push = [];
				data.forEach(function(rw) {
					if (!rev1[rw.id]) {
						sms2push.push(new Sms(rw));
						rev1[rw.id] = 1;
					}
					self.retrieveLastSmsTimestamp = Math.max(self.retrieveLastSmsTimestamp,rw.timestamp);
				});
				if (sms2push.length > 0)
					ko.utils.arrayPushAll(self.smsData,sms2push);
				self.retrieveStatus(sms2push.length > 0 ? sms2push.length + " message" + (sms2push.length>1?"s":"") + " received":"No new messages");
				if (self.retrieveState() == "play") {
					var counter = 10;
					var runCounter = function() {
						self.retrieveCounter = setTimeout(function() {
							counter--;
							if (self.retrieveState() != "play") return;
							self.retrieveStatus("Waiting for " + counter + " seconds");
							if (counter > 0) runCounter();
							else self.retrieveRun();
						},1000);
					}
					runCounter();
				}
			}
		});
	}

	TrackerPageDebug.prototype.retrieveInit = function() {
		var self = this;
		this.retrieveLastSmsTimestamp = 0;
		this.retrieveCounter = null;
		this.retrieveState.subscribe(function(state) {
			if (state == "play") self.retrieveRun();
			else clearTimeout(self.retrieveCounter);
		});
		this.retrieveState.notifySubscribers(this.retrieveState());
	}

	TrackerPageDebug.prototype.templates = ["main"];

	return TrackerPageDebug;
});
