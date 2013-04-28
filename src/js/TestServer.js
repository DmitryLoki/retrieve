define(["utils"],function(utils) {

	// Тестовый сервер со случайными данными
	var TestServer = function(options) {
		this.options = options;

		this.generateData = function() {
			options = this.options.testServerOptions;
			this.pilots = [];
			this.events = [];
			this.waypoints = [];
			for (var i = 0; i < options.waypointsCnt; i++) {
				var dtInt = Math.floor((options.endKey-options.startKey)/options.waypointsCnt);
				var dtOpen = Math.floor((options.startKey + dtInt * i + Math.floor(Math.random()*dtInt/2))/1000)*1000;
				var dtClose = dtOpen + Math.floor(Math.random()*dtInt/2/1000)*1000;
				if (i == 0) this.options.testServerOptions.raceStartKey = dtOpen;
				this.waypoints.push({
					id: i,
					name: "Waypoint #" + i,
					type: (i==0?"to":(i==options.waypointsCnt-1?"goal":"waypoint")),
					lat: options.coords.center.lat + (Math.random()-0.5)*options.waypoints.dispersion,
					lng: options.coords.center.lng + (Math.random()-0.5)*options.waypoints.dispersion,
					radius: options.waypoints.minRadius + Math.random()*(options.waypoints.maxRadius-options.waypoints.minRadius),
					height: options.waypoints.height,
					textSize: 1,
					texture: "/art/redbull4.png",
					openTime: dtOpen,
					closeTime: dtClose
				});
			}

			var startDirection = Math.random()*360;

			// Цвета в формате [r,g,b,alpha] для owg. alpha пока не работает, должна быть = 1, но если owg пофиксят, будет поддерживаться
			var colors = [[0,0,0,1],[1,0,0,1],[0,1,0,1],[0,0,1,1],[1,1,0,1],[1,0,1,1],[0,1,1,1],[1,1,1,1]];
			var countries = "RU HU CZ NO".split(/ /);

			var toRGB = function(ar) {
				var decColor = 0x1000000 + Math.floor(255*ar[2]) + 0x100 * Math.floor(ar[1]*255) + 0x10000 * Math.floor(ar[0]*255);
			    return "#" + decColor.toString(16).substr(1);
			}

			for (var i = 0; i < options.pilotsCnt; i++)
				this.pilots.push({
					id: i,
					name: "Pilot #" + i,
					owgModelUrl: "/art/models/paraplan5.json.amd",
					country: countries[i%countries.length],
					textSize: 0.5,
					trackColor: colors[i%colors.length],
					trackWidth: 2,
					color: toRGB(colors[i%colors.length]),
					icons: this.options.icons,
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
				optWay = [];
				for (var i = 0; i < this.waypoints.length; i++) {
					optWay.push({
						lat: this.waypoints[i].lat,
						lng: this.waypoints[i].lng
					});
				}
				data = {
					startKey: this.options.testServerOptions.startKey,
					endKey: this.options.testServerOptions.endKey,
					raceStartKey: this.options.testServerOptions.raceStartKey,
					center: this.options.testServerOptions.coords.center,
					waypoints: this.waypoints,
					optWay: optWay,
					titles: {
						mainTitle: this.options.testServerOptions.mainTitle,
						taskTitle: this.options.testServerOptions.taskTitle,
						dateTitle: this.options.testServerOptions.dateTitle,
						placeTitle: this.options.testServerOptions.placeTitle
					}
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
			},delay || this.options.testServerOptions.testDelay);
		}
	}

	return TestServer;
});