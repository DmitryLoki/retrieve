define([
    'utils',
    'walk',
    'knockout',
    'knockout.mapping',
    'EventEmitter',
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
	EventEmitter,
	GoogleMap,
	PlayerControl,
	UfosTable,
    Checkbox,
    Window,
    OwgMap
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


	// Все переменные TrackerPageDebug
	var options = {
		// Настройки тестового сервера
		testServerOptions: {
			pilotsCnt: 20,
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
				dispersion: 0.05,
				maxRadius: 500,
				minRadius: 300,
				height: 500,
			},
			// Задержка, с которой тестовый сервер отдает ответ
			testDelay: 1000
		},
		// Установленная по умолчанию скорость в плеере
		playerSpeed: 1,
		// Задержка, с которой обновляются данные в таблице
	}




	// Тестовый сервер со случайными данными
	var TestServer = function() {
		this.generateData = function(options) {
			this.options = options;
			this.pilots = [];
			this.events = [];
			this.waypoints = [];
			for (var i = 0; i < options.waypointsCnt; i++) {
				this.waypoints.push({
					id: i,
					name: "Waypoint #" + i,
					type: (i==0?"start":(i==options.waypointsCnt-1?"finish":"waypoint")),
					lat: options.coords.center.lat + Math.random()*options.waypoints.dispersion - options.waypoints.dispersion/2,
					lng: options.coords.center.lng + Math.random()*options.waypoints.dispersion - options.waypoints.dispersion/2,
					radius: options.waypoints.minRadius + Math.random()*(options.waypoints.maxRadius-options.waypoints.minRadius),
					height: options.waypoints.height,
					textSize: 1,
					texture: "/art/redbull4.png"
				});
			}

			var startDirection = Math.random()*360;

			// Цвета в формате [r,g,b,alpha] для owg. alpha пока не работает, должна быть = 1, но если owg пофиксят, будет поддерживаться
			var colors = [[0,0,0,1],[1,0,0,1],[0,1,0,1],[0,0,1,1],[1,1,0,1],[1,0,1,1],[0,1,1,1],[1,1,1,1]];

			var toRGB = function(ar) {
				var decColor = 0x1000000 + Math.floor(255*ar[2]) + 0x100 * Math.floor(ar[1]*255) + 0x10000 * Math.floor(ar[0]*255);
			    return "#" + decColor.toString(16).substr(1);
			}

			for (var i = 0; i < options.pilotsCnt; i++)
				this.pilots.push({
					id: i,
					name: "Pilot #" + i,
					owgModelUrl: "/art/models/paraplan5.json.amd",
					textSize: 0.5,
					trackColor: colors[i%colors.length],
					trackWidth: 2,
					color: toRGB(colors[i%colors.length]),
					icon: {url: "/img/ufoFly.png", width: 32, height: 35, x: 15, y: 32},
					tmp: {
						lat: options.coords.center.lat + Math.random()*options.coords.dispersion - options.coords.dispersion/2, 
						lng: options.coords.center.lng + Math.random()*options.coords.dispersion - options.coords.dispersion/2,
						direction: startDirection + (Math.random()-0.5)*options.coords.directionMaxStep,
						elevation: options.coords.center.elevation + Math.random()*options.coords.elevationDispersion - options.coords.elevationDispersion/2
					}
				});
			for (var dt = options.startKey; dt <= options.endKey; dt += options.dtStep) {
				for (var i = 0; i < this.pilots.length; i++) {
					// С некоторой вероятностью пилот не двигается
					if (Math.random() < options.coords.holdProbability && dt != options.startKey) continue;

					// l - last - предыдущее значение
					var l = {
						lat: this.pilots[i].tmp.lat,
						lng: this.pilots[i].tmp.lng,
						direction: this.pilots[i].tmp.direction
					}

					// Направление меняется на +- 30 градусов
					this.pilots[i].tmp.direction += (Math.random()-0.5) * options.coords.directionMaxStep;

					var tmpDistance = Math.random()*options.coords.maxStep;

					this.pilots[i].tmp.lat += tmpDistance*Math.cos(this.pilots[i].tmp.direction/180*Math.PI);
					this.pilots[i].tmp.lng += tmpDistance*Math.sin(this.pilots[i].tmp.direction/180*Math.PI);

//					this.pilots[i].tmp.lat += Math.random()*options.coords.maxStep - options.coords.maxStep/2;
//					this.pilots[i].tmp.lng += Math.random()*options.coords.maxStep - options.coords.maxStep/2;
					this.pilots[i].tmp.elevation += Math.random()*options.coords.elevationMaxStep - options.coords.elevationMaxStep/2;

					// Вставим вычисление yaw-оси прямо в сервер, это угол, под которым смотрит параплан, относительно востока
					// Против часовой стрелки в градусах от 0 до 180, по часовой - от 0 до -180
					// Угол параплана вообще-то не зависит от координат (может сносить ветром как угодно), но мы будем считать, 
					// что параплан всегда повернут передом в направлении своего движения
					var t = this.pilots[i].tmp;
					var yaw = 0;
					if (l.lat != t.lat || l.lng != t.lng) {
						if (l.lng == t.lng)
							yaw = l.lat < t.lat ? 90 : -90;
						else {
							yaw = Math.atan((t.lat - l.lat) / (t.lng - l.lng)) / Math.PI * 180;
							if (t.lng < l.lng) yaw = yaw + 180;
						}
					}
					if (yaw > 180) yaw = yaw - 360;

					this.events.push({
						dt: dt,
						pilot_id: i,
						lat: this.pilots[i].tmp.lat,
						lng: this.pilots[i].tmp.lng,
						yaw: yaw,
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
					center: this.options.coords.center,
					waypoints: this.waypoints
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
							data.start[i] = utils.extend({},this.events[ei]);
//							data.start[i] = {lat:this.events[ei].lat,lng:this.events[ei].lng,elevation:this.events[ei].elevation,yaw:this.events[ei].yaw};
							break;
						}
				}
				for (var i = 0; i < this.events.length; i++) {
					if (this.events[i].dt >= query.first && this.events[i].dt <= query.last) {
						if (!data.timeline[this.events[i].dt])
							data.timeline[this.events[i].dt] = {};
						data.timeline[this.events[i].dt][this.events[i].pilot_id] = utils.extend({},this.events[i]);
//						data.timeline[this.events[i].dt][this.events[i].pilot_id] = {dt:this.events[i].dt,lat:this.events[i].lat,lng:this.events[i].lng,elevation:this.events[i].elevation,yaw:this.events[i].yaw};
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
			},delay || this.options.testDelay);
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
				// При этом известно, что данные достаточны, т.е. обязательно есть для всех пилотов хотя бы стартовое положение.
				// Как работает: сначала пробегает по timeline по убыванию времени и складывает в data[pilot_id] 
				// первое найденое значение для каждого пилота.
				// Потом пробегает по start-данным, и проставляет значения пилотам, для которых не нашлось событий в timeline
				/*
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
				*/
				// Значит эта вся логика остается. И добавляется логика, нужная для анимации. 
				// Нам нужны не только координаты "до" dt, но и ближайшие "после".
				// Для каждого пилота нужно первое событие (по изменению его координат), которое произойдет после dt. 
				// Тогда построим линейное соотношение и получим текущее линейно анимированное положение.
				// При этом данные одного фрейма достаточны. т.е. если нет события "после", то параплан неподвижен. 
				// Очевидно, что при переходе в следующий фрейм он "не прыгнет", потому что если бы он прыгнул, 
				// было бы событие по изменению координат.
				var getDataFromFrame = function(frame,dt) {
					var data = {}, dataBefore = {}, dataAfter = {}, keys = [];

					// Пробегаем по всем событиям фрейма и ищем ближайшие события до и после dt
					for (var i in frame.timeline)
						if (frame.timeline.hasOwnProperty(i))
							for (var pilot_id in frame.timeline[i])
								if (frame.timeline[i].hasOwnProperty(pilot_id)) {
									if ((i <= dt) && (!dataBefore[pilot_id] || dataBefore[pilot_id].dt < i))
										dataBefore[pilot_id] = frame.timeline[i][pilot_id];
									if ((i >= dt) && (!dataAfter[pilot_id] || dataAfter[pilot_id].dt > i))
										dataAfter[pilot_id] = frame.timeline[i][pilot_id];
								}

					// Если у какого-то пилота не нашлось события до или после, проставляем его по данным frame.start
					for (var pilot_id in frame.start)
						if (frame.start.hasOwnProperty(pilot_id)) {
							if (!dataBefore[pilot_id]) dataBefore[pilot_id] = frame.start[pilot_id];
							if (!dataAfter[pilot_id]) dataAfter[pilot_id] = dataBefore[pilot_id];
						}

					// По событиям до и после строим линейную пропорцию и получаем мгновенные координаты пилота
					for (var pilot_id in dataBefore)
						if (dataBefore.hasOwnProperty(pilot_id)) {
							var d1 = dataBefore[pilot_id], d2 = dataAfter[pilot_id];
							if (d1.dt == d2.dt) {
								data[pilot_id] = dataBefore[pilot_id];
							}
							else {
								var p = (dt - d1.dt) / (d2.dt - d1.dt);
								var yawDelta = d2.yaw - d1.yaw;
								if (yawDelta > 180) yawDelta -= 360;
								if (yawDelta < -180) yawDelta += 360;
								data[pilot_id] = {
									lat: d1.lat + (d2.lat - d1.lat) * p,
									lng: d1.lng + (d2.lng - d1.lng) * p,
									elevation: d1.elevation + (d2.elevation - d1.elevation) * p,
									yaw: d1.yaw + yawDelta * p
								}
							}
						}

					// Upd. теперь нужна еще и траектория. Ограничимся опять-таки текущим фреймом.
					// Собственно, это значит, что весь фрейм и нужно вернуть.
					// Пока что не будем наворачивать логику в этом методе выше, и так сложная, еще раз по массивам пробежимся.
					for (var pilot_id in frame.start)
						if (frame.start.hasOwnProperty(pilot_id) && data[pilot_id]) {
							data[pilot_id].track = [];
							data[pilot_id].track.push(frame.start[pilot_id]);
						}
					for (var i in frame.timeline)
						if (frame.timeline.hasOwnProperty(i)) 
							for (var pilot_id in frame.timeline[i])
								if (frame.timeline[i].hasOwnProperty(pilot_id) && data[pilot_id])
									data[pilot_id].track.push(frame.timeline[i][pilot_id]);

					return data;
				}

				// Возвращает первый кеш, который в себя включает время dtOffset - количество секунд с начала гонки
				// То есть любой кеш, для любого интервала. Сначала могли крутить со скоростью x25, и в кеш попал интервал
				// cache[25][0], а потом переключили скорость и перекрутили на начало - cache[25][0] нам вернется,
				// он будет подходить, потому что будет включать в себя момент времени dtOffset
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
							self.cache[inSize][inOffset].callback(data);
							self.cache[inSize][inOffset].callback = function(data) { };
						}
					});
				}
			}
			else if (query.type == "tracks") {
				// Здесь мы запрашиваем данные о треках. Ради треков мы не делаем дополнительных запросов, рисуем
				// по тем данным, которые имеем в кеше. Однако это НЕ один фрейм, просматриваем все связанные фреймы и рисуем
				// максимальный связанный участок трека, такой, что для него есть данные

				// Количество секунд, прошедших с начала гонки
				var dtOffset = Math.floor((query.dt - query.dtStart) / 1000);

				var data = {};

				var addStartData = function(ar) {
					for (var pilot_id in ar)
						if (ar.hasOwnProperty(pilot_id)) {
							if (!data[pilot_id]) data[pilot_id] = {};
								if (!data[pilot_id][ar[pilot_id].dt])
									data[pilot_id][ar[pilot_id].dt] = ar[pilot_id];
						}
				}

				var addData = function(ar) {
					for (var dt in ar)
						if (ar.hasOwnProperty(dt))
							for (var pilot_id in ar[dt])
								if (ar[dt].hasOwnProperty(pilot_id)) {
									if (!data[pilot_id]) data[pilot_id] = {};
									if (!data[pilot_id][dt])
										data[pilot_id][dt] = ar[dt][pilot_id];
								}
				}

				for (var inSize in this.cache) {
					if (this.cache.hasOwnProperty(inSize)) {
						var inOffset = Math.floor(dtOffset / inSize);
						if (this.cache[inSize][inOffset] && this.cache[inSize][inOffset].status == "ready") {
							// получаем в inOffset индекс первого интервала с загруженными данными
							while(this.cache[inSize][inOffset-1] && this.cache[inSize][inOffset-1].status == "ready")
								inOffset--;
							// грузим стартовые данные (из start) на из первого связного загруженного интервала
							addStartData(this.cache[inSize][inOffset].data.start);
							// грузим события из timeline-ов всех загруженных фреймов начиная с первого пока они есть
							while(this.cache[inSize][inOffset] && this.cache[inSize][inOffset].status == "ready") {
								addData(this.cache[inSize][inOffset].data.timeline);
								inOffset++;
							}
						}
					}
				}

				// сортируем data, это может понадобиться когда разные куски грузились в разных inSize-ах и накладываются
				var out = {};
				for (var pilot_id in data)
					if (data.hasOwnProperty(pilot_id)) {
						var keys = [];
						for (var i in data[pilot_id])
							if (data[pilot_id].hasOwnProperty(i))
								if (i <= query.dt)
									keys.push(i);
//						out[pilot_id] = {data:{},start:keys[0],end:keys[keys.length-1]};
						out[pilot_id] = {data:{},start:keys[0],end:query.dt};
						for (var i = 0; i < keys.length; i++)
							out[pilot_id].data[keys[i]] = data[pilot_id][keys[i]];
					}

				query.callback(out);
			}
			// В остальных случаях будем просто запрашивать данные у сервера без кеширования
			else {
				this.options.server.get(query);
			}
		}
	}




	var Pilot = function(options) {
		this.id = options.id;
		this.name = options.name;
		this.map = options.map;
		this.icon = options.icon;
		this.trackColor = options.trackColor;
		this.color = options.color;

		this._ufo = this.map.ufo(options).icon(this.icon).visible(true);

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
				self.emit("loaded",self);
			});
		else
			self.emit("loaded",self);
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




	var TrackerPageDebug = function() {
		var self = this;
		this.map = new GoogleMap();
		this.owgMap = new OwgMap();
		this.ufos = ko.observableArray();
		this.waypoints = ko.observableArray();
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

	TrackerPageDebug.prototype.loadPilots = function(callback) {
		var self = this, loadedPilots = 0;
		this.ufos([]);
		this.dataSource.get({
			type: "pilots",
			callback: function(data) {
				for (var i = 0; i < data.length; i++) {
					var pilot = new Pilot(utils.extend(data[i],{
						map: self.owgMap
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
		if (this.owgMap && data.waypoints) {
			for (var i = 0; i < data.waypoints.length; i++)
				this.waypoints.push(this.owgMap.waypoint(data.waypoints[i]));
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
		var playerSpeed = options.playerSpeed;

		// Текущее актуальное время
		var playerCurrentTime = (new Date).getTime();

		// Центрируем карту, с сервера должны прийти дефолтные координаты камеры
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
						ufo.coordsUpdate(data[ufo.id]);
					});
					// Передвинем бегунок в playerControl-е
					self.playerControl.setTimePos(playerCurrentKey);
					if (callback)
						callback(data);

					// Теперь здесь сделаем запрос на получение инфы о треке
					// потому что если делать отдельно, вначале при загрузке еще нет данных в кеше
					self.dataSource.get({
						type: "tracks",
						dt: playerCurrentKey,
						dtStart: playerStartKey,
						callback: function(data) {
							self.ufos().forEach(function(ufo) {
								ufo.trackUpdate(data[ufo.id]);
							});
						}
					});
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
			tableTimerHandle = setTimeout(playTableData,options.renderTableDataInterval);
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
		.initTimeInterval(playerStartKey,playerEndKey)
		.pause();
	}

	TrackerPageDebug.prototype.domInit = function(elem, params) {
		var self = this;
		// Все запросы к тестовому серверу считаются асинхронными с callback-ом
		this.dataSource.get({
			type: "race",
			callback: function(data) {
				self.loadPilots(function() {
					self.loadWaypoints(data);
					self.playerInitNew(data);
				});
			}
		});
	}

	TrackerPageDebug.prototype.templates = ["main"];

	return TrackerPageDebug;
});