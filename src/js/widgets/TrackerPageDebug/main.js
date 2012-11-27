define([
    'utils',
    'walk',
    'knockout',
    'knockout.mapping',
    'widget!GoogleMap',
    'widget!PlayerControl',
    'widget!UfosTable',
    'widget!Checkbox',
    'knockout.restrictChangeSpeed'
], function(
	utils,
	walk,
	ko,
	komap,
	GoogleMap,
	PlayerControl,
	UfosTable,
    Checkbox
){

	var Pilot = function(options) {
		var p = this;
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

		this.updateTableData = function() {
			this.tableData.gSpd(this.gSpd());
			this.tableData.vSpd(this.vSpd());
//			komap.fromJS(this,{},this.tableData);
		}

		this.visibleChecked.subscribe(function(val){
			this._ufo.visible(val);
		},this);
	}

	Pilot.prototype.coordsUpdate = function(latlng) {
		var now = (new Date).getTime();
		this._ufo.move({lat: latlng.lat, lng: latlng.lng, time: now});
	}

	Pilot.prototype.calculateSpeed = function(step) {
		var prevStep = (step > 0 ? step : this.route.length) - 1;
		this.gSpd(parseInt((this.route[step].lat - this.route[prevStep].lat)*10000));
		this.vSpd(parseInt((this.route[step].lng - this.route[prevStep].lng)*10000));
	}

	Pilot.prototype.moveToStep = function(step) {
		this.coordsUpdate(this.route[step]);
		this.calculateSpeed(step);
	}

	var TrackerPageDebug = function() {
		var self = this;
		this.map = new GoogleMap();
		this.ufos = ko.observableArray();
		this.ufosTable = new UfosTable(this.ufos);
		this.playerControl = new PlayerControl();
	}

	TrackerPageDebug.prototype.generateRandomPilots = function(params) {
		var center = {lat:55.75,lng:37.61};
		for (var i = 0; i < 2; i++) {
			var pilot = new Pilot({
				name: "Pilot #" + i,
				map: this.map,
				icon: {url: params.imgRootUrl + "ufoFly.png", width: 32, height: 35, x: 15, y: 32}
			});
			pilot.route = [];
			pilot.route.push({lat:center.lat + Math.random()/2 - 0.25, lng: center.lng + Math.random()/2 - 0.25});
			for (var j = 1; j < 40; j++) {
				var prev = pilot.route[j-1];
				pilot.route.push({lat:prev.lat + Math.random()/10 - 0.05, lng: prev.lng + Math.random()/10 - 0.05});
			}
			pilot.moveToStep(0);
			this.ufos.push(pilot);
		}
	}

	TrackerPageDebug.prototype.playerInit = function() {

		var self = this;
		var startKey = (new Date()).getTime();
		var endKey = (new Date()).getTime() + 3600000;
		var currentKey = parseInt(startKey/1000);
		var playerSpeed = 1;
		var timerHandle = null;
		var tableTimerHandle = null;
		var renderTableDataInterval = 1000;

		var renderPilots = function() {
			self.ufos().forEach(function(pilot) {
				pilot.moveToStep(currentKey%pilot.route.length);
			});
		}

		var renderTableData = function() {
			self.ufos().forEach(function(pilot) {
				pilot.updateTableData();
			});
		}

		var playPilots = function() {
			clearTimeout(timerHandle);
			renderPilots();
			self.playerControl.setTimePos(currentKey*1000);
			currentKey++;
			timerHandle = setTimeout(playPilots,1000/playerSpeed);
		}

		var playTableData = function(stopSwitch) {
			clearTimeout(tableTimerHandle);
			renderTableData();
			if (!stopSwitch)
				tableTimerHandle = setTimeout(playTableData,renderTableDataInterval);
		}

		var pausePilots = function() {
			clearTimeout(timerHandle);
		}

		var pauseTableData = function() {
			playTableData(true);
		}

		var play = function() {
			playPilots();
			playTableData();
		}

		var pause = function() {
			pausePilots();
			pauseTableData();
		}

		var changeSpeed = function(speed) {
			playerSpeed = speed;
		}

		var changePos = function(time) {
			currentKey = parseInt(time/1000);
		}

		self.playerControl
		.on('play', play)
		.on('pause', pause)
		.on('time', changePos)
		.on('speed', changeSpeed)
		.initTimeInterval(startKey,endKey)
		.pauseClick();
	}

	TrackerPageDebug.prototype.domInit = function(elem, params) {
		this.generateRandomPilots(params);
		this.playerInit();
	}

	TrackerPageDebug.prototype.templates = ['main'];

	return TrackerPageDebug;
});
