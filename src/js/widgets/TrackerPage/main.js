define([
    'utils',
    'walk',
    'knockout',
    'knockout.mapping',
    'widget!Button',
    'widget!GoogleMap',
    'widget!PlayerControl',
    'widget!UfosTable'
], function(
	utils,
	walk,
	ko,
	komap,
	Button,
	GoogleMap,
	PlayerControl,
	UfosTable
){
	var AUTO_TRACKS_TIME = 10 * 60 * 1000;
	var OFFLINE_DATA_KEYS_QUANT = 1000;
	
	var TableUfo = function(params){
		this.id = params.id;
		this.name = params.name;
		this.color = params.color;
		this.state = params.state;
		
		this.leftDist = ko.observable(params.leftDist);
		
		this.visibleChecked = ko.observable(true);
		this.alt = ko.observable(this.state != 'flying' ? this.state : '');
		this.gSpd = ko.observable();
		this.vSpd = ko.observable();
		
		var self = this;
		this.statusOrDist = ko.computed(function(){ //TODO: также разделить поля alt и state
			if(self.statusText)
				return self.statusText;
			var dist = self.leftDist();
				return dist < 4294967295 ? (dist / 1000).toFixed(1) : '';
		});
		this.visibleChecked.subscribe(function(val){
			self._ufo.visible(val);
		});
	};
	
	TableUfo._all = {};
	
	TableUfo.prototype.init = function(params){
		this.iconParamsFly = params.iconParamsFly;
		this.iconParamsLand = params.iconParamsLand;
		
		this._ufo = params.map.ufo({ title: this.name, color: this.color })
		.icon(this.state == 'flying' ? this.iconParamsFly : this.iconParamsLand)
		.visible(this.visibleChecked())
		.trackVisible(params.tracksMode != 'off')
		.titleVisible(params.titlesMode != 'off');
				
		TableUfo._all[this.id] = this;
	};
	
	TableUfo.prototype.destroy = function(){
		delete TableUfo._all[this.id];
	};

	TableUfo.prototype.stateUpdate = function(params){
		if(params.state == 'landed'){
			if(this.state != 'landed')
				this._ufo.icon(this.iconParamsLand);
			this.alt(params.state);
			this.leftDist(params.leftDist);
		}
		else if(params.state == 'finished'){
			if(this.state != 'finished'){
				this.alt(params.state);
				this.statusText = parseInt(params.finishTime / 60) + ':' + (params.finishTime % 60);
				this._ufo.icon(this.iconParamsLand);				
			}
		}
		else if(params.state == 'flying'){
			if(this.state != 'flying')
				this._ufo.icon(this.iconParamsFly);
			this.leftDist(params.leftDist);
		}
		else if(params.state == 'not started'){
			if(this.state != 'not started'){
				this.alt(params.state);
				this._ufo.icon(this.iconParamsLand);
			}
			this.leftDist(params.leftDist);
		}
		else
			utils.log('stateUpdate: unknown state "' + params.state + '"!');
		
		this.state = params.state;
	};
	
	TableUfo.prototype.coordsUpdate = function(params){
		if(params.gSpd !== undefined)
			this.gSpd(params.gSpd);
		if(params.vSpd !== undefined)
			this.vSpd(params.vSpd);
		if(params.alt !== undefined)
			if(this.state == 'flying')
				this.alt(params.alt);

		if(params.lat !== undefined){
			var now = (new Date).getTime();
			this._ufo.move({ lat: params.lat, lng: params.lng, time: now });
			if(params.tracksMode == 'auto')
				this._ufo.trackFilter(now - AUTO_TRACKS_TIME);
		}
	};
	
	var TrackerPage = function(){
		var self = this;
		this.map = new GoogleMap;
		this.playerControl = new PlayerControl;
		
		this.ufos = ko.observableArray();
		this.ufosTable = new UfosTable(this.ufos);
		
		this.tracksMode = ko.observable();
		this.tracksMode.subscribe(function(val){
			switch(val){
			case 'on':
				self.ufos().forEach(function(item){
					item._ufo.trackVisible(true);
				});
				break;
			case 'off':
				self.ufos().forEach(function(item){
					item._ufo.trackVisible(false);
				});
				break;
			case 'auto':
				self.ufos().forEach(function(item){
					item._ufo.trackFilter((new Date).getTime() - AUTO_TRACKS_TIME);
					item._ufo.trackVisible(true);
				});
				break;
			}
		});

		this.titlesMode = ko.observable();
		this.titlesMode.subscribe(function(val){
			switch(val){
			case 'on':
				self.map.titlesHideByZoom(false);
				self.ufos().forEach(function(item){
					item._ufo.titleVisible(true);
				});
				break;
			case 'off':
				self.map.titlesHideByZoom(false);
				self.ufos().forEach(function(item){
					item._ufo.titleVisible(false);
				});
				break;
			case 'auto':
				self.map.titlesHideByZoom(true);
				self.ufos().forEach(function(item){
					item._ufo.titleVisible(true);
				});
				break;
			}
		});
	};
	
	TrackerPage.prototype.initOnline = function(elem, params){		
		var self = this;
		
		$.ajax({ url: '/scanex/load_start_data_wo_pilots_content/0/' + params.taskId, type: 'GET', dataType: 'json', success: waypointsLoad });
		
		function waypointsLoad(data){
			self.waypointsLoad(data);
			$.ajax({ url: '/g2.0/init', type: 'GET', dataType: 'json', success: pilotsFromJson });
		}
		
		function pilotsFromJson(data){
			komap.fromJS(data.models, {
				arrayChanged: function(event, item){
					switch(event){
					case 'added':
						item.init({
							iconParamsFly: { url: params.imgRootUrl + 'ufoFly.png', width: 32, height: 35, x: 15, y: 32 },
							iconParamsLand: { url: params.imgRootUrl + 'ufoLand.png', width: 32, height: 28, x: 15, y: 26 },
							tracksMode: self.tracksMode(),
							titlesMode: self.titlesMode(),
							map: self.map
						});
						break;
					case 'deleted':
						item.destroy();
						break;
					}
				},
				key: function(item){
					return item.id;
			    },
				create: function(map){
					return new TableUfo({
						id: map.data.id,
						name: map.data.firstname + ' ' + map.data.lastname,
						color: map.data.color,
						state: map.data.state,
						leftDist: map.data.left_dist
					});
				},
			}, self.ufos);
			
			statesLoad();
		}
		
		function statesLoad(){
			$.ajax({ url: '/g2.0/states', type: 'GET', dataType: 'json', success: statesUpdate });
		}
				
		function statesUpdate(data){
			data.body.forEach(function(item){
				var tableUfo = TableUfo._all[item.id];
				if(!tableUfo){
					utils.log('statesUpdate: ID "'+ item.id +'" not found!');
					return;
				}
				tableUfo.stateUpdate({
					leftDist: item.ld,
					finishTime: item.finish_time,
					state: item.state
				});
			});
			
			$.ajax({ url: '/g2.0/coords', type: 'GET', dataType: 'json', success: coordsUpdate });
		}
		
		function coordsUpdate(data){
			data.body.forEach(function(item){
				var tableUfo = TableUfo._all[item.id];
				if(!tableUfo){
					utils.log('coordsUpdate: ID "'+ item.id +'" not found!');
					return;
				}
				tableUfo.coordsUpdate({
					gSpd: item.hs,
					vSpd: item.vs,
					alt: item.alt,
					lat: item.lat,
					lng: item.lon,
					tracksMode: self.tracksMode()
				});
			});
			
			tableSort();
		}
		
		function tableSort(){
			self.tableSort();
			setTimeout(statesLoad, 1000);
		}
	};
	
	TrackerPage.prototype.tableSort = function(){
		this.ufos.sort(function(left, right){
			var l = parseInt(left.leftDist());
			l = isNaN(l) ? -1 : l;
			var r = parseInt(right.leftDist());
			r = isNaN(r) ? -1 : r;
			return l == r ? 0 : l > r ? 1 : -1;
		});
	};

	TrackerPage.prototype.waypointsLoad = function(data){
		var wps = [];
		for(var i = 1; data.waypoints[i]; i++){
			var w = data.waypoints[i];
			wps.push({
				lat: w[0],
				lng: w[1],
				radius: parseInt(w[2]),
				title: w[3],
				type: parseInt(w[6]) ? 'start' : parseInt(w[7]) ? 'finish' : 'waypoint'
			});
		}
		this.map.waypoints(wps);
	};
	
	TrackerPage.prototype.initOffline = function(elem, params){	
		var self = this;
		
		if(params.eventId)
			eventIdLoad(params.eventId);
		else
			$.ajax({ url: '/services/json/task/' + params.taskId + '/getEvent.json', type: 'GET', dataType: 'json', success: eventIdLoad }); //eventIdLoad('1211');
		
		function eventIdLoad(data){
			self.eventId = data;
			
			$.ajax({
				url: '/scanex/load_start_data/' + self.eventId + '/' + params.taskId,
				type: 'GET',
				data: { is_repeat: 0 },
				dataType: 'json',
				success: startDataLoad
			});
		}
		
		function startDataLoad(data){
			self.waypointsLoad(data);
			pilotsFromJson(data.pilots);
			playerInit(data.task_start, data.task_end);
		}
		
		function pilotsFromJson(pilots){
			for(var id in pilots){
				var pilot = pilots[id];
				var tableUfo = new TableUfo({
					id: id,
					name: pilot.name,
					color: pilot.color,
					state: 'not started', //TODO: все пилоты в этом поле имеют null, возможно, нужна какая-то логика вычисления стартового стейта
					leftDist: pilot.last_dist
				});
				tableUfo.init({
					iconParamsFly: { url: params.imgRootUrl + 'ufoFly.png', width: 32, height: 35, x: 15, y: 32 },
					iconParamsLand: { url: params.imgRootUrl + 'ufoLand.png', width: 32, height: 28, x: 15, y: 26 },
					tracksMode: self.tracksMode(),
					titlesMode: self.titlesMode(),
					map: self.map
				});
				self.ufos.push(tableUfo);
			}
		}
		
		function playerInit(startKey, endKey){
			
			var playerStartKey;
			var playerEndKey;
			var playerCurrentKey;
			var playerSpeed = 1;
			var timerHandle;

			var tableData;
			var coordsData;
//			function statesUpdate(data){
//				data.body.forEach(function(item){
//					var tableUfo = TableUfo._all[item.id];
//					if(!tableUfo){
//						utils.log('statesUpdate: ID "'+ item.id +'" not found!');
//						return;
//					}
//					tableUfo.stateUpdate({
//						leftDist: item.ld,
//						finishTime: item.finish_time,
//						state: item.state
//					});
//				});
//				
//				$.ajax({ url: '/g2.0/coords', type: 'GET', dataType: 'json', success: coordsUpdate });
//			}
//			
//			function coordsUpdate(data){
//				data.body.forEach(function(item){
//					var tableUfo = TableUfo._all[item.id];
//					if(!tableUfo){
//						utils.log('coordsUpdate: ID "'+ item.id +'" not found!');
//						return;
//					}
//					tableUfo.coordsUpdate({
//						gSpd: item.hs,
//						vSpd: item.vs,
//						alt: item.alt,
//						lat: item.lat,
//						lng: item.lon,
//						tracksMode: self.tracksMode()
//					});
//				});
//				
//				tableSort();
//			}
//			
//			function tableSort(){
//				self.tableSort();
//				setTimeout(statesLoad, 1000);
//			}
			
			function renderFrame(){
				coordsData[playerCurrentKey].forEach(function(item){
					var tableUfo = TableUfo._all[item.id];
					if(!tableUfo){
						utils.log('coordsUpdate: ID "'+ item.id +'" not found!');
						return;
					}
					tableUfo.coordsUpdate({
						lat: item.lat,
						lng: item.lng,
						tracksMode: self.tracksMode()
					});
				});
				
				tableData[playerCurrentKey].forEach(function(item){
					var tableUfo = TableUfo._all[item.id];
					if(!tableUfo){
						utils.log('coordsUpdate: ID "'+ item.id +'" not found!');
						return;
					}
//					если время меньше last_time — пилот летит («flying»). 
//					Если больше либо равно — пилот приземлился(«landed»), 
//					если при этом есть параметр finish_time — пилот финишировал («finished»),
//					если время меньше first_time — «not started».
					var state = 'flying';
					tableUfo.stateUpdate({
						leftDist: item.leftDist,
						//finishTime: item.finish_time,
						state: state
					});
					tableUfo.coordsUpdate({
						gSpd: item.gSpd,
						vSpd: item.vSpd,
						alt: item.alt
					});
				});
				
				self.tableSort();
			}

			function play(){
				clearTimeout(timerHandle);
				if(playerCurrentKey > endKey){
					self.playerControl._state('pause');
					return;
				}
				if(playerCurrentKey > playerEndKey){
					changePos(playerCurrentKey * 1000);
					return;
				}
				
				self.playerControl.setTimePos(playerCurrentKey * 1000);
				
				renderFrame();

				playerCurrentKey ++;
				timerHandle = setTimeout(play, 1000 / playerSpeed);
			}
			
			function pause(){
				clearTimeout(timerHandle);
			}
			
			var needPlay = true;
			function changePos(time){
				self.playerControl.enabled(false);
				pause();
				
				var _playerStartKey = parseInt(time / 1000);
				var _playerEndKey = _playerStartKey + OFFLINE_DATA_KEYS_QUANT;
				if(_playerEndKey > endKey)
					_playerEndKey = endKey;
				
				var _tableData;
				var _coordsData;
				
				walk()
				.step(function(step){
					$.ajax({
						url: '/cd5/event' + self.eventId + '/_design/' + params.taskId + '/_view/table',
						type: 'GET',
						data: { startkey: _playerStartKey, endkey: _playerEndKey },
						dataType: 'json',
						success: function(data){
							_tableData = {};
							data.rows.forEach(function(row){
								if(!_tableData[row.key])
									_tableData[row.key] = [];
								_tableData[row.key].push({
									id: row.value[0],
									alt: row.value[1],
									gSpd: row.value[2],
									vSpd: row.value[3],
									leftDist: row.value[4]
								});
							});
							step.next();
						}
					});
				})
				.step(function(step){
					$.ajax({
						url: '/cd5/event' + self.eventId + '/_design/' + params.taskId + '/_view/coords',
						type: 'GET',
						data: { startkey: _playerStartKey, endkey: _playerEndKey },
						dataType: 'json',
						success: function(data){
							_coordsData = {};
							data.rows.forEach(function(row){
								if(!_coordsData[row.key])
									_coordsData[row.key] = [];
								_coordsData[row.key].push({
									id: row.value[0],
									lat: row.value[1],
									lng: row.value[2]
								});
							});
							step.next();
						}
					});
				})
				.wait(function(){
					tableData = _tableData;
					coordsData = _coordsData;
					
					playerStartKey = _playerStartKey;
					playerEndKey = _playerEndKey;
					playerCurrentKey = playerStartKey;
					self.playerControl.setTimePos(time);
					
					self.playerControl.enabled(true);
					if(self.playerControl.getState() == 'play')
						play();
					
					if(needPlay){
						needPlay = false;
						play();
					}
				});
			}
			
			function changeSpeed(speed){
				playerSpeed = speed;
			}
			
			self.playerControl
			.on('play', play)
			.on('pause', pause)
			.on('time', changePos)
			.on('speed', changeSpeed)
			.initTimeInterval(startKey * 1000, endKey * 1000);
		}
	};
	
	TrackerPage.prototype.domInit = function(elem, params){
		this.titlesMode('auto');
		this.tracksMode('auto');
		
		if(params.isOnline)
			this.initOnline(elem, params);
		else
			this.initOffline(elem, params);
		
	};
	
	TrackerPage.prototype.templates = ['main'];

	return TrackerPage;
});
