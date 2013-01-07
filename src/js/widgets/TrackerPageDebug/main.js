define([
    'utils',
    'walk',
    'knockout',
    'knockout.mapping',
    'widget!GoogleMap',
    'widget!PlayerControl',
    'widget!UfosTable',
    'widget!Checkbox',
    'widget!Window',
    'widget!OwgMap'
], function(
	utils,
	walk,
	ko,
	komap,
	GoogleMap,
	PlayerControl,
	UfosTable,
    Checkbox,
    Window,
    OwgMap
){

	// Все переменные TrackerPageDebug
	var options = {
		// Настройки тестового сервера
		testServerOptions: {
			pilotsCnt: 10,
			startKey: (new Date).getTime() - 60000,
			endKey: (new Date).getTime(),
			dtStep: 1000,
			// Данные для генератора координат
			coords: {
				center: {
					lat: 55.75,
					lng: 37.61,
					elevation: 200
				},
				// Разброс стартового положения пилотов
				dispersion: 0.02,
				elevationDispersion: 50,
				// Максимальная дистанция, на которую пилот может улететь за 1 шаг
				maxStep: 0.005,
				elevationMaxStep: 1,
				// Вероятность того, что пилот не будет двигаться на текущем шаге
				holdProbability: 0
			}
		},
		// Установленная по умолчанию скорость в плеере
		playerSpeed: 1,
		// Задержка, с которой обновляются данные в таблице
		renderTableDataInterval: 1000
	}


	// Тестовый сервер со случайными данными
	var TestServer = function() {
		this.generateData = function(options) {
			this.options = options;
			this.pilots = [];
			this.events = [];
			for (var i = 0; i < options.pilotsCnt; i++)
				this.pilots.push({
					id: i,
					name: "Pilot #" + i,
					tmp: {
						lat: options.coords.center.lat + Math.random()*options.coords.dispersion - options.coords.dispersion/2, 
						lng: options.coords.center.lng + Math.random()*options.coords.dispersion - options.coords.dispersion/2,
						elevation: options.coords.center.elevation + Math.random()*options.coords.elevationDispersion - options.coords.elevationDispersion/2
					}
				});
			for (var dt = options.startKey; dt <= options.endKey; dt += options.dtStep) {
				for (var i = 0; i < this.pilots.length; i++) {
					// С некоторой вероятностью пилот не двигается
					if (Math.random() < options.coords.holdProbability && dt != options.startKey) continue;
					this.pilots[i].tmp.lat += Math.random()*options.coords.maxStep - options.coords.maxStep/2;
					this.pilots[i].tmp.lng += Math.random()*options.coords.maxStep - options.coords.maxStep/2;
					this.pilots[i].tmp.elevation += Math.random()*options.coords.elevationMaxStep - options.coords.elevationMaxStep/2;
					this.events.push({
						dt: dt,
						pilot_id: i,
						lat: this.pilots[i].tmp.lat,
						lng: this.pilots[i].tmp.lng,
						elevation: this.pilots[i].tmp.elevation
					});
				}
			}
		}
		// Знаем, что генерация events шла order by dt, т.е. событие с бОльшим индексом имеет бОльший dt
		// получаем максимальный индекс события, которое шло до dt
		this.getMaxIndexByDt = function(dt) {
			for (var i = this.events.length - 1; i >= 0; i--)
				if (this.events[i].dt <= dt)
					return i;
		} 
		this.get = function(query) {
			var data = {};
			// TODO: пока не разобрался, какие данные должны приходит при инициализации гонки
			if (query.type == "race") {
				data = {
					startKey: this.options.startKey,
					endKey: this.options.endKey,
					center: this.options.coords.center
				}
			}
			// Аналог GET /contest/{contestid}/race/{raceid}/pilot из api
			else if (query.type == "pilots") {
				data = utils.extend(true,[],this.pilots);
			}
			// Аналог GET /contest/{contestid}/race/{raceid}/timeline
			else if (query.type == "timeline" && query.first && query.last) {
				data = {start:{},timeline:{}};
				// Находим максимальный индекс массива events с dt <= query.min, будем просматривать все элементы от него
				// по убыванию, пока не встретим событие для нужного пилота, чтобы заполнить им его start данные 
				var maxEventsIndex = this.getMaxIndexByDt(query.first);
				for (var i = 0; i < this.pilots.length; i++) {
					for (var ei = maxEventsIndex; ei >= 0; ei--)
						if (this.events[ei].pilot_id == i) {
							data.start[i] = {lat:this.events[ei].lat,lng:this.events[ei].lng,elevation:this.events[ei].elevation};
							break;
						}
				}
				for (var i = 0; i < this.events.length; i++) {
					if (this.events[i].dt >= query.first && this.events[i].dt <= query.last) {
						if (!data.timeline[this.events[i].dt])
							data.timeline[this.events[i].dt] = {};
						data.timeline[this.events[i].dt][this.events[i].pilot_id] = {lat:this.events[i].lat,lng: this.events[i].lng, elevation: this.events[i].elevation};
					}
				}
			}
			if (query.callback)
				query.callback(data);
		}
		// Отдает ответ с задержкой delay
		this.getWithDelay = function(query,delay) {
			var self = this;
			setTimeout(function() {
				self.get(query);
			},delay);
		}
	}


	// Источник данных, типа кеширующего прокси, все данные должны запрашиваться через него, а не напрямую у server-а
	var DataSource = function(options) {
		var self = this;
		this.options = options;
		this.cache = {};
		this.cacheCallbacks = {};
		this.get = function(query) {
			// TODO: добавить обработку error на случай если нет options.server или в query что-то не то
			// Для типа timeline DataSource должен выдать координаты всех пилотов на момент времени options.dt.
			if (query.type == "timeline") {
				// Здесь основная логика, это зачем вообще DataSource нужен.
				// Нужно дать координаты на момент dt, при этом можно запросить данные на промежуток с запасом, 
				// чтобы через секунду не слать новый запрос. Нужен балланс между объемом данных в запросе и частотой запросов.
				// Первый блин - запрашиваем на 5 секунд * timeMultiplier, т.е. в случае x25 - на 125 секунд.
				// Есть массив из загруженных интервалов. Если dt не попадает в один из них, нужно ставить загрузку 
				// соответствующего интервала, после окончания загрузки отдавать данные.
				// Если интервал есть, но скоро кончается, и после него данные не загружены, то нужно отдавать данные сейчас + 
				// + ставить на загрузку следующий интервал. Если на момент dt данные не загружены, но уже грузятся,
				// то нужно ждать и вызывать callback после того запроса, что сейчас в процессе.

				// Еще момент: можем просмотреть всю гонку на скорости x25, а потом перекрутить на начало и смотреть на x1.
				// В этом случае глупо не использовать кеш из x25.

				// TODO: придумать название
				// Фрейм - это то, что приходит с сервера и складывается в кеш, т.е. start data + список events
				// Функция по данному frame вычисляет мгновенные данные всех объектов на момент dt
				// Как работает: сначала пробегает по timeline по убыванию времени и складывает в data[pilot_id] 
				// первое найденое значение для каждого пилота.
				// Потом пробегает по start-данным, и проставляет значения пилотам, для которых не нашлось событий в timeline
				var getDataFromFrame = function(frame,dt) {
					var data = {}, keys = [];
					for (var i in frame.timeline)
						if (frame.timeline.hasOwnProperty(i))
							keys.push(i);
					keys.sort().reverse();
					for (var i = 0; i < keys.length; i++) {
						var key = keys[i];
						if (key > dt) continue;
						for (var pilot_id in frame.timeline[key])
							if (frame.timeline[key].hasOwnProperty(pilot_id) && !data[pilot_id])
									data[pilot_id] = frame.timeline[key][pilot_id];
					}
					for (var pilot_id in frame.start)
						if (frame.start.hasOwnProperty(pilot_id) && !data[pilot_id])
							data[pilot_id] = frame.start[pilot_id];
					return data;
				}

				// Возвращает первый кеш, который в себя включает время dtOffset - количество секунд с начала гонки
				var getCachedFrame = function(cache,dtOffset) {
					for (var inSize in cache) {
						if (cache.hasOwnProperty(inSize)) {
							var inOffset = Math.floor(dtOffset / inSize);
							if (cache[inSize][inOffset])
								return cache[inSize][inOffset];
						}
					}
					return null;
				}


				// Количество секунд, прошедших с начала гонки
				var dtOffset = Math.floor((query.dt - query.dtStart) / 1000);

				// Ищем среди всех кешей интервал, в который входит query.dt
				var cachedFrame = getCachedFrame(this.cache,dtOffset);

				// Размер интервала в секундах, т.е. грузим либо на 5, либо на 50, либо на 125 секунд
				var inSize = 5 * query.timeMultiplier;
				// Количество интервалов, прошедших с начала гонки
				var inOffset = Math.floor(dtOffset / inSize);
				// Начало интервала в милисекундах
				var first = query.dtStart + inOffset * inSize * 1000;
				// Конец интервала в милисекундах
				var last = query.dtStart + (inOffset + 1) * inSize * 1000;

				// Предзагрузка
				// Наш timeline разбит на интервалы размера inSize. Пусть inSize = 5 секунд. И пусть cachedFrame
				// уже есть, т.е. загружен или грузится. Пусть dt=4, т.е. хотим получить кооринаты на 4-й секунде 
				// загруженного интервала. Значение есть и мы его отдаем или отдадим после загрузки. 
				// Но при этом хорошо бы делать предзагрузку следующего интервала.
				// К примеру, если dt > inSize / 2 и на момент dt + inSize загруженного интервала нет, то поставим его на загрузку 
				if (!query.disablePreload && cachedFrame && (dtOffset > inSize * inOffset + inSize / 2) && !getCachedFrame(this.cache,dtOffset + inSize)) {
					this.get({
						type: query.type,
						dt: query.dt + inSize * 1000,
						timeMultiplier: query.timeMultiplier,
						dtStart: query.dtStart,
						disablePreload: true,
						callback: function(data) { }
					});
				}

				// Если есть кеш, отдадим его значение на момент query.dt
				if (cachedFrame && cachedFrame.status == "ready") {
					query.callback(getDataFromFrame(cachedFrame.data,query.dt));
				}
				// Интервал сейчас загружается, не нужно запускать новую загрузку
				// Проставим только, чтобы после окончания загрузки интервала выполнился наш callback
				else if (cachedFrame && cachedFrame.status == "loading") {
					cachedFrame.callback = function(data) {
						query.callback(getDataFromFrame(data,query.dt));
					}
				}
				// Кеша нет, делаем запрос
				else {
					
					// Инициализируем новый интервал в кеше
					if (!self.cache[inSize])
						self.cache[inSize] = {};
					self.cache[inSize][inOffset] = {
						status: "loading",
						first: first,
						last: last,
						inSize: inSize,
						inOffset: inOffset,
						callback: function(data) {
							query.callback(getDataFromFrame(data,query.dt));
						}
					}

					this.options.server.getWithDelay({
						type: "timeline",
						first: first,
						last: last,
						callback: function(data) {
							self.cache[inSize][inOffset].status = "ready";
							self.cache[inSize][inOffset].data = data;
							if (self.cache[inSize][inOffset].callback) {
								self.cache[inSize][inOffset].callback(data);
								delete self.cache[inSize][inOffset].callback;
							}
//							query.callback(getDataFromFrame(data,query.dt));
						}
					},1000);
				}
			}
			// В остальных случаях будем просто запрашивать данные у сервера без кеширования
			else {
				this.options.server.get(query);
			}
		}
	}


	var Pilot = function(options) {
		var p = this;
		this.id = options.id;
		this.name = options.name;

		this.map = options.map;
		this.icon = options.icon;		
		this._ufo = this.map.ufo({
			title: this.name,
			color: "#c00000"
		}).icon(this.icon).visible(true);

		this.visibleChecked = ko.observable(true);
        this.visibleCheckbox = new Checkbox({checked:this.visibleChecked});
		this.color = "#f0f0f0";
		this.statusOrDist = "test";
		this.statusText = "flying";
		this.alt = "test";
		this.gSpd = ko.observable(0);
		this.vSpd = ko.observable(0);
		this.tableData = {
			gSpd: ko.observable(0),
			vSpd: ko.observable(0)
		}
		this.coordsUpdate = function(data,duration) {
			this._ufo.move(data,duration);
		}
		this.updateTableData = function() {
			// пока выключим, непонятно, как считать скорость
			// this.tableData.gSpd(this.gSpd());
			// this.tableData.vSpd(this.vSpd());
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
	}


	var TrackerPageDebug = function() {
		var self = this;
		this.map = new GoogleMap();
		this.owgMap = new OwgMap();
		this.ufos = ko.observableArray();
		this.ufosTable = new UfosTable(this.ufos);
		this.playerControl = new PlayerControl();
		this.playerControlWindow = new Window();
		this.mapWindow = new Window();
		this.ufosTableWindow = new Window({title:"Pilots Table",width: 700});

		// Делаем тестовый сервер, данные для него - из options.testServerOptions
		this.server = new TestServer();
		this.server.generateData(options.testServerOptions);
		// Создаем dataSource, устанавливаем ему в качестве источника данных тестовый сервер
		this.dataSource = new DataSource({
			server: this.server
		});
	}


	TrackerPageDebug.prototype.loadPilots = function() {
		var self = this;
		this.ufos([]);
		this.dataSource.get({
			type: "pilots",
			callback: function(data) {
				for (var i = 0; i < data.length; i++) {
					var p = new Pilot({
						id: data[i].id,
						name: data[i].name,
//						map: self.map,
						map: self.owgMap,
						icon: {url: "/img/ufoFly.png", width: 32, height: 35, x: 15, y: 32}
					});
					self.ufos.push(p);
				}
			}
		});
	}


	TrackerPageDebug.prototype.playerInit = function(data) {
		var self = this;
		var playerStartKey = data.startKey;
		var playerEndKey = data.endKey;
		var playerCurrentKey = data.startKey;
		var playerSpeed = options.playerSpeed;

		if (this.owgMap && data.center) {
			this.owgMap.setCameraLookAtPosition({
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
						// Здесь вторым параметром прокидываем duration, чтобы маркер ufo мог плавно двигаться
						ufo.coordsUpdate(data[ufo.id],1000/playerSpeed);
					});
					// Передвинем бегунок в playerControl-е
					self.playerControl.setTimePos(playerCurrentKey);
					if (callback)
						callback(data);
				}
			});
		}

		// При инициализации и когда вручную тащим бегунок слайдера, нужно уметь задавать положение на определенное время
		// При этом ессно обновлять данные таблицы, а то вдруг у нас состояние pause, при котором данные не обновляются автоматически
		var setSpecificFrame = function(time) {
			playerCurrentKey = time;
			renderFrame(function() {
				renderTableData();
			});
		}

		// TODO: придумать нормальное название
		// эта функция вызывает renderFrame и в его callback-е c задержкой в 1000/playerSpeed вызывает сама себя
		var timelineIntervalCycler = function() {
			clearTimeout(timerHandle);
			renderFrame(function() {
				timerHandle = setTimeout(function() {
					playerCurrentKey += 1000;
					if (playerCurrentKey > playerEndKey) {
						self.playerControl.pause();
						return;
					}
					timelineIntervalCycler();
				},1000/playerSpeed);
			});
		}
		var playTimeline = function() {
			pauseTimeline();
			timelineIntervalCycler();
		}
		var pauseTimeline = function() {
			clearTimeout(timerHandle);
			// TODO: может висеть недогруженный ajax-запрос в server-е. Нужно его отменить
		}

		// Следующие 3 метода - обновление данных таблицы. 
		// Обновление должно происходить со своей задержкой, независимо от скорости обновления данных 
		var renderTableData = function() {
			self.ufos().forEach(function(ufo) {
				ufo.updateTableData();
			});
		}
		var playTableData = function() {
			clearTimeout(tableTimerHandle);
			renderTableData();
			tableTimerHandle = setTimeout(playTableData,options.renderTableDataInterval);
		}
		var pauseTableData = function() {
			playTableData();
			clearTimeout(tableTimerHandle);
		}

		var play = function() {
			playTimeline();
			playTableData();
		}
		var pause = function() {
			pauseTimeline();
			pauseTableData();
		}
		var changeSpeed = function(speed) {
			playerSpeed = speed;
		}

		// У PlayerControl-а есть событие change - оно вызывается, когда, к примеру, двигаем слайдер. 
		// Или когда происходят любые изменения PlayerControl.time(), но эти изменения идут изнутри, а не
		// являются следствием того, что трекер пейдж проставил новое время
		var playerControlChange = function(time) {
			setSpecificFrame(time);
		}

		// Нужно проставить маркеры, для этого нужно получить их начальное положение и после этого проставить данные в таблице
		setSpecificFrame(playerStartKey);

		self.playerControl
		.on('play', play)
		.on('pause', pause)
		.on('speed', changeSpeed)
		.on('change', playerControlChange)
		.initTimeInterval(playerStartKey,playerEndKey)
		.pause();
	}


	TrackerPageDebug.prototype.domInit = function(elem, params) {
		var self = this;
		// Все запросы к тестовому серверу считаются асинхронными с callback-ом
		this.dataSource.get({
			type: "race",
			callback: function(data) {
				self.loadPilots();
				self.playerInit(data);
			}
		});
	}

	TrackerPageDebug.prototype.templates = ['main'];

	return TrackerPageDebug;
});