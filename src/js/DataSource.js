define(function() {

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
				// Значит эта вся логика остается. И добавляется логика, нужная для анимации. 
				// Нам нужны не только координаты "до" dt, но и ближайшие "после".
				// Для каждого пилота нужно первое событие (по изменению его координат), которое произойдет после dt. 
				// Тогда построим линейное соотношение и получим текущее линейно анимированное положение.
				// При этом данные одного фрейма достаточны. т.е. если нет события "после", то параплан неподвижен. 
				// Очевидно, что при переходе в следующий фрейм он "не прыгнет", потому что если бы он прыгнул, 
				// было бы событие по изменению координат.
				var getDataFromFrame = function(frame,dt) {
					var data = {}, dataBefore = {}, dataAfter = {}, keys = [];
					// Пробегаем по всем событиям фрейма и для каждого пилота ищем ближайшие события до и после dt
					for (var i in frame.timeline)
						if (frame.timeline.hasOwnProperty(i))
							for (var pilot_id in frame.timeline[i])
								if (frame.timeline[i].hasOwnProperty(pilot_id)) {
									i = Math.floor(i);
									if ((i <= dt) && (!dataBefore[pilot_id] || Math.floor(dataBefore[pilot_id].dt) < i))
										dataBefore[pilot_id] = frame.timeline[i][pilot_id];
									if ((i >= dt) && (!dataAfter[pilot_id] || Math.floor(dataAfter[pilot_id].dt) > i))
										dataAfter[pilot_id] = frame.timeline[i][pilot_id];
								}

					// Если у какого-то пилота не нашлось события до или после, проставляем его по данным frame.start
					for (var pilot_id in frame.start)
						if (frame.start.hasOwnProperty(pilot_id)) {
							if (!dataBefore[pilot_id]) dataBefore[pilot_id] = frame.start[pilot_id];
							if (!dataAfter[pilot_id]) dataAfter[pilot_id] = dataBefore[pilot_id];
						}

					// Все равно может не быть dataBefore или dataAfter (вначале гонки пилот еще не включил трекер)
					// На таких пилотов забиваем, отдаем только тех, у которых есть данные dataBefore

					// По событиям до и после строим линейную пропорцию и получаем мгновенные координаты пилота
					for (var pilot_id in dataBefore)
						if (dataBefore.hasOwnProperty(pilot_id)) {
							var d1 = dataBefore[pilot_id], d2 = dataAfter[pilot_id];
//							console.log(d1,d2,frame.start[pilot_id]);
							if (!d2 || d1.dt == d2.dt)
								data[pilot_id] = {
									dist: d1.dist,
									gspd: d1.gspd,
									vspd: d1.vspd,
									position: {
										lat: d1.position.lat,
										lng: d1.position.lng,
										dt: dt
									},
									track: {
										lat: d1.position.lat,
										lng: d1.position.lng,
										dt: d1.dt
									},
									alt: d1.alt,
//									state: d1.state ? d1.state : frame.start[pilot_id] ? frame.start[pilot_id].state : null,
//									stateChangedAt: d1.stateChangedAt ? d1.stateChangedAt : frame.start[pilot_id] ? frame.start[pilot_id].stateChangedAt : null,
									state: d1.state,
									stateChangedAt: d1.stateChangedAt,
									dt: d1.dt
								}
							else {
								var p = (dt-d1.dt)/(d2.dt-d1.dt);
								data[pilot_id] = {
									dist: d1.dist,
									gspd: d1.gspd,
									vspd: d1.vspd,
									position: {
										lat: d1.position.lat+(d2.position.lat-d1.position.lat)*p,
										lng: d1.position.lng+(d2.position.lng-d1.position.lng)*p,
										dt: dt
									},
									track: {
										lat: d1.position.lat,
										lng: d1.position.lng,
										dt: d1.dt
									},
									alt: d1.alt,
//									state: d1.state ? d1.state : frame.start[pilot_id] ? frame.start[pilot_id].state : null,
//									stateChangedAt: d1.stateChangedAt ? d1.stateChangedAt : frame.start[pilot_id] ? frame.start[pilot_id].stateChangedAt : null,
									state: d1.state,
									stateChangedAt: d1.stateChangedAt,
									dt: d1.dt
								}
							}
						}


					// Upd. теперь нужна еще и траектория. Ограничимся опять-таки текущим фреймом.
					// Собственно, это значит, что весь фрейм и нужно вернуть.
					// Пока что не будем наворачивать логику в этом методе выше, и так сложная, еще раз по массивам пробежимся.
					/*
					for (var pilot_id in frame.start)
						if (frame.start.hasOwnProperty(pilot_id) && data[pilot_id]) {
							data[pilot_id].track = [];
							data[pilot_id].track.push(frame.start[pilot_id]);
						}
					for (var i in frame.timeline)
						if (frame.timeline.hasOwnProperty(i)) 
							for (var pilot_id in frame.timeline[i])
								if (frame.timeline[i].hasOwnProperty(pilot_id) && data[pilot_id]) {
									if (!data[pilot_id].track) data[pilot_id].track = [];
									data[pilot_id].track.push(frame.timeline[i][pilot_id]);
								}
					*/
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
				var inSize = 30 * query.timeMultiplier;

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
					this.options.server.get({
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

				// Милисекунды начала трека, если грузить только последние 10 мин
				query.dtMin = query.restrict ? Math.max(query.dt - query.restrict*1000,0) : 0;

				var dtMin = query.restrict ? Math.max(dtOffset - query.restrict,0) : 0;
				var dtMin = 0;

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
							// при этом не берем интервалы раньше чем dtMin (если нужен трек за последние 10 мин)
							while(this.cache[inSize][inOffset-1] && this.cache[inSize][inOffset-1].status == "ready" && (dtMin==0 || dtMin <= (inOffset-1)*inSize))
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
								if (i <= query.dt && i >= query.dtMin)
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

	return DataSource;
});