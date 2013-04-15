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
    'DataSource',
    'ShortWay'
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
    DataSource,
    ShortWay
){

	var TrackerPageDebug = function() {
		this.initialize();
	}

	TrackerPageDebug.prototype.options = {
		// Виджет карты - GoogleMap или OWG
		mapType: "GoogleMap",
		// Настройки тестового сервера
		testServerOptions: {
			mainTitle: "52th FAI european paragliding championship",
			taskTitle: "Task1 - 130km",
			dateTitle: "22 Sep, 2012",
			placeTitle: "France, Saint Andre les Alpes",
			pilotsCnt: 2,
			waypointsCnt: 5,
			startKey: (new Date).getTime() - 60000,
			endKey: (new Date).getTime(),
			dtStep: 1000,
			// Данные для генератора координат
			coords: {
				center: {
					lat: 55.75,
					lng: 37.61,
					elevation: 500
				},
				// Разброс стартового положения пилотов
				dispersion: 0.02,
				elevationDispersion: 100,
				// Максимальная дистанция, на которую пилот может улететь за 1 шаг
				maxStep: 0.005,
				elevationMaxStep: 100,
				// Вероятность того, что пилот не будет двигаться на текущем шаге
				holdProbability: 0,
				// угол в градусах, на который максимум может повернуться параплан
				directionMaxStep: 30
			},
			waypoints: {
				dispersion: 0.1,
				maxRadius: 1600,
				minRadius: 600,
				height: 500,
			},
			// Задержка, с которой тестовый сервер отдает ответ
			testDelay: 1000
		},
		// Установленная по умолчанию скорость в плеере
		playerSpeed: 1,
		// Задержка, с которой обновляются данные в таблице
		renderTableDataInterval: 1000,
		windows: {
			ufosTable: {
				visible: true,
				title: "Leaderboard",
				height: 300,
				width: 700,
				top: 380,
				left: 90 
			},
			playerControl: {
				visible: true,
				title: "Player",
				width: 340,
				top: 160,
				left: 90
			},
			mainMenu: {
				visible: true,
				title: "Title",
				showHeader: false,
				resizable: false,
				absoluteCloseIcon: true,
				width: 800,
				top: 50,
				left: 90,
				height: 100
			}
		},
		tracksVisualMode: "full",
		cylindersVisualMode: "empty",
		modelsVisualMode: "medium",
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
		}
	}




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




	var Pilot = function(options) {
		this.id = options.id;
		this.name = options.name;
		this.map = options.map;
		this.icon = options.icon;
		this.trackColor = options.trackColor;
		this.color = options.color;

		this._ufo = this.map.ufo(options);

		this.visibleChecked = ko.observable(true);
        this.visibleCheckbox = new Checkbox({checked:this.visibleChecked});
		this.titleVisibleChecked = ko.observable(true);
        this.titleVisibleCheckbox = new Checkbox({checked:this.titleVisibleChecked});
		this.trackVisibleChecked = ko.observable(true);
        this.trackVisibleCheckbox = new Checkbox({checked:this.trackVisibleChecked,color:this.color});

		this.statusOrDist = "test";
		this.statusText = "flying";
		this.alt = "test";
		this.gSpd = ko.observable(0);
		this.vSpd = ko.observable(0);
		this.tableData = {
			gSpd: ko.observable(0),
			vSpd: ko.observable(0)
		}
//		this.calculateSpeed = function(step) {
//			var prevStep = (step > 0 ? step : this.route.length) - 1;
//			this.gSpd(parseInt((this.route[step].lat - this.route[prevStep].lat)*10000));
//			this.vSpd(parseInt((this.route[step].lng - this.route[prevStep].lng)*10000));
//		}
//		this.moveToStep = function(step) {
//			this.coordsUpdate(this.route[step]);
//			this.calculateSpeed(step);
//		}
		this.visibleChecked.subscribe(function(val){
			this._ufo.visible(val);
		},this);
		this.titleVisibleChecked.subscribe(function(val) {
			this._ufo.titleVisible(val);
		},this);
		this.trackVisibleChecked.subscribe(function(val) {
			this._ufo.trackVisible(val);
		},this);
	}

	utils.extend(Pilot.prototype,EventEmitter.prototype);

	Pilot.prototype.initialize = function() {
		var self = this;
		if (this._ufo.hasAsyncInit)
			this._ufo.asyncInit(function() {
				self.initialized();
				self.emit("loaded",self);
			});
		else {
			self.initialized();
			self.emit("loaded",self);
		}
	}

	Pilot.prototype.initialized = function() {
		this._ufo.icon(this.icon).visible(true);
	}
 
	Pilot.prototype.coordsUpdate = function(data,duration) {
		this._ufo.move(data,duration);
	}

	Pilot.prototype.trackUpdate = function(data) {
		this._ufo.trackUpdate(data);
	}

	Pilot.prototype.updateTableData = function() {
			// пока выключим, непонятно, как считать скорость
			// this.tableData.gSpd(this.gSpd());
			// this.tableData.vSpd(this.vSpd());
	}




	TrackerPageDebug.prototype.initialize = function() {
		var self = this;

		this.ufos = ko.observableArray();
		this.waypoints = ko.observableArray();

		this.mapType = this.options.mapType;
		if (this.mapType == "GoogleMap")
			this.map = new GoogleMap();
		else if (this.mapType == "OwgMap")
			this.map = new OwgMap();

		this.ufosTable = new UfosTable(this.ufos);
		this.ufosTableWindow = new Window(this.options.windows.ufosTable);

		this.playerControl = new PlayerControl();
		this.playerControlWindow = new Window(this.options.windows.playerControl);

		this.mainMenu = new MainMenu();
		this.mainMenuWindow = new Window(this.options.windows.mainMenu);

		this.topBar = new TopBar();
		this.topBar.items.push(this.mainMenuWindow,this.ufosTableWindow,this.playerControlWindow);
		
		this.windowManager = new WindowManager();
		this.windowManager.items.push(this.ufosTableWindow,this.playerControlWindow,this.mainMenuWindow);

		this.tracksVisualMode = ko.observable("");
		this.cylindersVisualMode = ko.observable("");
		this.modelsVisualMode = ko.observable("");
		this.shortWayVisualMode = ko.observable("");
		this.playerControl.on("setTracksVisualMode",function(v) {
			self.tracksVisualMode(v);
		});
		this.playerControl.on("setCylindersVisualMode",function(v) {
			self.cylindersVisualMode(v);
		});
		this.playerControl.on("setModelsVisualMode",function(v) {
			self.modelsVisualMode(v);
		});
		this.playerControl.on("setShortWayVisualMode",function(v) {
			self.shortWayVisualMode(v);
		});
		this.tracksVisualMode.subscribe(function(v) {
			self.playerControl.setTracksVisualMode(v);
			self.map.setTracksVisualMode(v);
		});
		this.cylindersVisualMode.subscribe(function(v) {
			self.playerControl.setCylindersVisualMode(v);
			self.map.setCylindersVisualMode(v);
		});
		this.modelsVisualMode.subscribe(function(v) {
			self.playerControl.setModelsVisualMode(v);
			self.map.setModelsVisualMode(v);
		});
		this.shortWayVisualMode.subscribe(function(v) {
			self.playerControl.setShortWayVisualMode(v);
			self.map.setShortWayVisualMode(v);
		});
		this.tracksVisualMode(this.options.tracksVisualMode);
		this.cylindersVisualMode(this.options.cylindersVisualMode);
		this.modelsVisualMode(this.options.modelsVisualMode);
		this.shortWayVisualMode(this.options.shortWayVisualMode);

		this.server = new TestServer();
		this.server.generateData(this.options.testServerOptions);
		// Создаем dataSource, устанавливаем ему в качестве источника данных тестовый сервер
		this.dataSource = new DataSource({
			server: this.server
		});
	}

	TrackerPageDebug.prototype.setTitles = function(data) {
		if (this.mainMenu)
			this.mainMenu.setTitles(data.titles);
	}

	TrackerPageDebug.prototype.loadPilots = function(callback) {
		var self = this, loadedPilots = 0;
		this.ufos([]);
		this.dataSource.get({
			type: "pilots",
			callback: function(data) {
				for (var i = 0; i < data.length; i++) {
					var pilot = new Pilot(utils.extend(data[i],{
						map: self.map
					}));
					pilot.on("loaded",function(p) {
						self.ufos.push(p);
						loadedPilots++;
						if (loadedPilots == data.length && callback)
							callback();
					});
					pilot.initialize();
				}
			}
		});
	}

	TrackerPageDebug.prototype.loadWaypoints = function(data,callback) {
		// Рисуем цилиндры
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

	// Новая версия playerInit отличается другим подходам к таймаутам.
	// Раньше тик зависел от скорости, на speed=1 тикал раз в секунду, запрашивал через dataSource данные, двигал маркеры
	// Теперь попробуем тикать независимо от скорости с тиком, подходящим для анимации.
	// Будем гораздо чаще запрашивать у dataSource данные, но на то он и кеш. 
	// dataSource должен будет внутри себя интерполировать данные, и для дробной секунды выдавать хотя бы линейное среднее 
	// между окружающими ее целыми секундами.
	TrackerPageDebug.prototype.playerInitNew = function(data) {
		var self = this;

		// Даннные в милисекундах, время начала и конца гонки. Текущее время плеера устанавливается на начало гонки
		var playerStartKey = data.startKey;
		var playerEndKey = data.endKey;
		var playerCurrentKey = data.startKey;
		var playerSpeed = this.options.playerSpeed;

		// Текущее актуальное время
		var playerCurrentTime = (new Date).getTime();

		// Центрируем карту, с сервера должны прийти дефолтные координаты камеры
		if (this.map && data.center) {
			this.map.setCameraLookAtPosition({
				latitude: data.center.lat,
				longitude: data.center.lng
			});
		}

		var timerHandle = null;
		var tableTimerHandle = null;

		var renderFrame = function(callback) {
			self.dataSource.get({
				type: "timeline",
				dt: playerCurrentKey,
				timeMultiplier: playerSpeed,
				dtStart: playerStartKey,
				callback: function(data) {
					// в data ожидается массив с ключами - id-шниками пилотов и данными - {lat и lng} - текущее положение
					self.ufos().forEach(function(ufo) {
						data[ufo.id]["time"] = playerCurrentKey;
						ufo.coordsUpdate(data[ufo.id]);
					});
					// Передвинем бегунок в playerControl-е
					self.playerControl.setTimePos(playerCurrentKey);
					if (callback)
						callback(data);

					// Теперь здесь сделаем запрос на получение инфы о треке
					// потому что если делать отдельно, вначале при загрузке еще нет данных в кеше
					if (self.tracksVisualMode() != "off") {
						self.dataSource.get({
							type: "tracks",
							dt: playerCurrentKey,
							dtStart: playerStartKey,
							restrict: self.tracksVisualMode() == "10min" ? 10 : null,
							callback: function(data) {
								self.ufos().forEach(function(ufo) {
									ufo.trackUpdate(data[ufo.id]);
								});
							}
						});
					}
				}
			});
		}

		// Следующие 3 метода - обновление данных таблицы. 
		// Обновление должно происходить со своей задержкой, независимо от скорости обновления данных 
		var renderTableData = function() {
			self.ufos().forEach(function(ufo) {
				ufo.updateTableData();
			});
		}
		var playTableData = function() {
			renderTableData();
			tableTimerHandle = setTimeout(playTableData,self.options.renderTableDataInterval);
		}
		var pauseTableData = function() {
			renderTableData();
			clearTimeout(tableTimerHandle);
		}

		// При инициализации и когда вручную тащим бегунок слайдера, нужно уметь задавать положение на определенное время
		// При этом ессно обновлять данные таблицы, а то вдруг у нас состояние pause, при котором данные не обновляются автоматически
		var setSpecificFrame = function(time) {
			playerCurrentKey = time;
			renderFrame(function() {
				renderTableData();
			});
		}

		var timelineIntervalCycler = function() {
			renderFrame(function() {
				if (self.playerControl.getState() != "play") return;
				playerCurrentTime = (new Date).getTime();
				requestAnimFrame(function() {
					var t = (new Date).getTime();
					playerCurrentKey += (t - playerCurrentTime) * playerSpeed;
					playerCurrentTime = t;
					if (playerCurrentKey >= playerEndKey) {
						playerCurrentKey = playerEndKey;
						self.playerControl.pause();
						return;
					}
					timelineIntervalCycler();
				});
			});
		}

		// Нужно проставить маркеры, для этого нужно получить их начальное положение и после этого проставить данные в таблице
		setSpecificFrame(playerStartKey);

		self.playerControl
		.on("play",function() {
			timelineIntervalCycler();
			playTableData();
		})
		.on("pause",function() {
			pauseTableData();
		})
		.on("speed",function(speed) {
			playerSpeed = speed;
		})
		.on("change",function(time) {
			setSpecificFrame(time);
		})
		.on("setTracksVisualMode",function(v) {
			setSpecificFrame(playerCurrentKey);
		})
		.initTimeInterval(playerStartKey,playerEndKey)
		.pause();
	}

	TrackerPageDebug.prototype.domInit = function(elem, params) {
		var self = this;
		// Все запросы к серверу считаются асинхронными с callback-ом
		this.dataSource.get({
			type: "race",
			callback: function(data) {
				self.loadPilots(function() {
					self.setTitles(data);
					self.loadWaypoints(data);
					self.loadShortWay(data);
					self.playerInitNew(data);
				});
			}
		});
	}

	TrackerPageDebug.prototype.templates = ["main"];

	return TrackerPageDebug;
});