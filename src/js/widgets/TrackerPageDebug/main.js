define([
    'utils',
    'walk',
    'knockout',
    'knockout.mapping',
    'widget!GoogleMap',
], function(
	utils,
	walk,
	ko,
	komap,
	GoogleMap
){

	var Pilot = function(options) {
		this.name = options.name;
		this.map = options.map;
		this.icon = options.icon;		
		this._ufo = this.map.ufo({
			title: this.name,
			color: "#c00000"
		}).icon(this.icon).visible(true);
	}

	Pilot.prototype.coordsUpdate = function(latlng) {
		var now = (new Date).getTime();
		this._ufo.move({lat: latlng.lat, lng: latlng.lng, time: now});
	}

	Pilot.prototype.moveToStep = function(step) {
		console.log("moveToStep",step,this.route,this.route[step]);
		this.coordsUpdate(this.route[step]);
	}

	var TrackerPageDebug = function() {
		this.map = new GoogleMap();
//		this.pilots = ko.observableArray();
		this.pilots = [];
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
			pilot.route.push({lat:center.lat + Math.floor(Math.random()*10) - 5, lng: center.lng + Math.floor(Math.random()*10) - 5});
			for (var j = 1; j < 10; j++) {
				var prev = pilot.route[j-1];
				pilot.route.push({lat:prev.lat + Math.floor(Math.random()*2) - 1, lng: prev.lng + Math.floor(Math.random()*2) - 1});
			}
			pilot.moveToStep(0);
			this.pilots.push(pilot);
		}
	}

	TrackerPageDebug.prototype.startPlay = function() {
		var self = this;
		var play = function() {
			self.step = self.step ? self.step + 1 : 1;
			self.pilots.forEach(function(pilot) {
				pilot.moveToStep(self.step%pilot.route.length);
			});
//			self.playTimer = setTimeout(play,1000);
		}
		play();
	}

	TrackerPageDebug.prototype.domInit = function(elem, params) {
		this.generateRandomPilots(params);
		console.log(this.pilots);
		this.startPlay();
	}

	TrackerPageDebug.prototype.templates = ['main'];

	return TrackerPageDebug;
});
