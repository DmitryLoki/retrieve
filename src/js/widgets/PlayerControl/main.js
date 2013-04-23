define(['knockout', 'widget!Slider', 'widget!RadioGroup', 'widget!Select'], function(ko, Slider, RadioGroup, Select){
	var PlayerControl = function() {
		var self = this;

		this._state = ko.observable("play");
		this._state.subscribe(function(val) {
			if (val == "play" || val == "pause")
				self.emit(val);
		});

		this._speed = ko.observable(1);
		this._speed.subscribe(function(val) {
			self.emit("speed",val);
		});

		this._timeKey = ko.observable(0);
		this._dragKey = ko.observable(0);
		this._dragging = ko.observable(false);
		this._raceStartKey = 0;

		var getTimeStr = function(h,m,s) {
			return (h<10?"0":"") + h + ":" + (m<10?"0":"") + m + ":" + (s<10?"0":"") + s;
		}

		this.localTime = ko.computed(function() {
			var key = self._dragging() ? self._dragKey() : self._timeKey();
			var d = new Date(key);
			return getTimeStr(d.getHours(),d.getMinutes(),d.getSeconds());
		});

		this.raceTime = ko.computed(function() {
			var key = self._dragging() ? self._dragKey() : self._timeKey();
			var d = Math.abs(Math.floor((key-self._raceStartKey)/1000));
			return (key<self._raceStartKey?"-":" ") + getTimeStr(Math.floor(d/3600),Math.floor(d%3600/60),d%60);
		});

		this.raceTimeText = ko.computed(function() {
			return "Race to goal time";
			var key = self._dragging() ? self._dragKey() : self._timeKey();
			return key < self._raceStartKey ? "Race to goals starts in" : "Race to goal is on";
		});

		this.raceTimeCss = ko.computed(function() {
			var key = self._dragging() ? self._dragKey() : self._timeKey();
			return key < self._raceStartKey ? "airvis-inactive" : "airvis-active";
		});

		// Событие change вызывается когда делается дроп слайдера, т.е. когда val слайдера меняется изнутри
		// виджета Slider. В этом случае нужно емитить событие наверх.
		// Когда val слайдер проставляется сверху из трекер пейджа, по идее слайдер не должен вызывать change.
		// Но мы вставим дополнительную проверку, чтобы код точно не зациклился.
		this._silence = false;
		this.slider = new Slider({enabled:false});
		this.slider.on("change",function(val) {
			if (!self._silence)
				self.emit("change",val);
		});

		this.slider.on("dragStart",function() {
			self._dragging(true);
			self._dragKey(self._timeKey());
		});

		this.slider.on("dragEnd",function() {
			self._dragging(false);
		});

		this.slider.on("dragChange",function(val) {
			self._dragKey(val);
		});

		this.enabled = ko.observable(false);
		this.enabled.subscribe(function(val) {
			self.slider.set("enabled",!!val);
		});

		this.tracksVisualMode = ko.observable();
		this.cylindersVisualMode = ko.observable();
		this.modelsVisualMode = ko.observable();
		this.shortWayVisualMode = ko.observable();
		this.namesVisualMode = ko.observable();

		this.tracksVisualSelect = new Select({data:this.tracksVisualMode,label:"Tracks",values:[{value:"10min",title:"10 min"},{value:"full",title:"Full"},{value:"off",title:"Off"}],expandDirection:"up"});
		this.cylindersVisualSelect = new Select({data:this.cylindersVisualMode,label:"Cylinders",values:[{value:"full",title:"Full"},{value:"empty",title:"Empty"},{value:"off",title:"Off"}]});
		this.modelsVisualSelect = new Select({data:this.modelsVisualMode,label:"Models",values:[{value:"large",title:"Large"},{value:"medium",title:"Medium"},{value:"small",title:"Small"}],expandDirection:"up"});
		this.shortWayVisualSelect = new Select({data:this.shortWayVisualMode,label:"Shortest way",values:[{value:"wide",title:"Wide"},{value:"thin",title:"Thin"},{value:"off",title:"Off"}]});
		this.namesVisualSelect = new Select({data:this.namesVisualMode,label:"Names",values:[{value:"on",title:"On"},{value:"auto",title:"Auto"},{value:"off",title:"Off"}]});
		
		var fadeSelects = function(v) {
			var selects = ["tracksVisualSelect","cylindersVisualSelect","modelsVisualSelect","shortWayVisualSelect","namesVisualSelect"];
			for (var i = 0; i < selects.length; i++)
				if (self[selects[i]] != v)
					self[selects[i]].fade();
		}

		var unfadeSelects = function() {
			var selects = ["tracksVisualSelect","cylindersVisualSelect","modelsVisualSelect","shortWayVisualSelect","namesVisualSelect"];
			for (var i = 0; i < selects.length; i++)
				self[selects[i]].unfade();
		}

		this.tracksVisualSelect.on("expand",fadeSelects).on("collapse",unfadeSelects);
		this.cylindersVisualSelect.on("expand",fadeSelects).on("collapse",unfadeSelects);
		this.modelsVisualSelect.on("expand",fadeSelects).on("collapse",unfadeSelects);
		this.shortWayVisualSelect.on("expand",fadeSelects).on("collapse",unfadeSelects);
		this.namesVisualSelect.on("expand",fadeSelects).on("collapse",unfadeSelects);


		this.tracksVisualMode.subscribe(function(v) {
			self.emit("setTracksVisualMode",v);
		});
		this.cylindersVisualMode.subscribe(function(v) {
			self.emit("setCylindersVisualMode",v);
		});
		this.modelsVisualMode.subscribe(function(v) {
			self.emit("setModelsVisualMode",v);
		});
		this.shortWayVisualMode.subscribe(function(v) {
			self.emit("setShortWayVisualMode",v);
		});
		this.namesVisualMode.subscribe(function(v) {
			self.emit("setNamesVisualMode",v);
		});
	}

	PlayerControl.prototype.setRaceStartKey = function(v) {
		this._raceStartKey = v;
	}

	PlayerControl.prototype.setTracksVisualMode = function(v) {
		this.tracksVisualMode(v);
	}

	PlayerControl.prototype.setCylindersVisualMode = function(v) {
		this.cylindersVisualMode(v);
	}

	PlayerControl.prototype.setModelsVisualMode = function(v) {
		this.modelsVisualMode(v);
	}

	PlayerControl.prototype.setShortWayVisualMode = function(v) {
		this.shortWayVisualMode(v);
	}

	PlayerControl.prototype.setNamesVisualMode = function(v) {
		this.namesVisualMode(v);
	}

	PlayerControl.prototype.getState = function() {
		return this._state();
	}

	PlayerControl.prototype.play = function() {
		this._state("play");
		return this;
	}
	
	PlayerControl.prototype.pause = function() {
		this._state("pause");
		return this;
	}

	PlayerControl.prototype.changeSpeed = function(newSpeed) {
		this._speed(Math.round(ko.utils.unwrapObservable(newSpeed)));
		return this;
	}
	
	PlayerControl.prototype.setTimePos = function(time) { //TODO: сделать через time()
		this._silence = true;
		time = ko.utils.unwrapObservable(time);
		this.slider.set("val",time);
		this._timeKey(time);
		this._silence = false;
		return this;
	}

	PlayerControl.prototype.initTimeInterval = function(timeStart, timeFinish) {
		this._silence = true;
		timeStart = ko.utils.unwrapObservable(timeStart);
		timeFinish = ko.utils.unwrapObservable(timeFinish);
		this.slider.set({
			min: timeStart,
			max: timeFinish,
			val: timeStart
		});
		this._timeKey(timeStart);
		this.enabled(true);
		this._silence = false;
		return this;
	}

	PlayerControl.prototype.templates = ["main"];

	return PlayerControl;
});