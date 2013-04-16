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
		this._raceStartKey = 0;

		this.localTime = ko.computed(function() {
			var d = new Date(self._timeKey());
			var h = d.getHours();
			var m = d.getMinutes();
			var s = d.getSeconds();
			return (h<10?"0":"") + h + ":" + (m<10?"0":"") + m + ":" + (s<10?"0":"") + s;
		});

		this.raceTime = ko.computed(function() {
			var d = Math.floor(Math.abs(self._timeKey()-self._raceStartKey)/1000);
			var h = Math.floor(d/3600);
			var m = Math.floor(d%3600/60);
			var s = d%60;
			return (self._timeKey()<self._raceStartKey?"-":" ") + (h<10?"0":"") + h + ":" + (m<10?"0":"") + m + ":" + (s<10?"0":"") + s;
		});

		this.raceTimeText = ko.computed(function() {
			return "Race to goal time";
			return self.timeKey() < self._raceStartKey ? "Race to goals starts in" : "Race to goal is on";
		});

		this.raceTimeCss = ko.computed(function() {
			return self._timeKey() >= self._raceStartKey ? "airvis-active" : "airvis-inactive";
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

		this.enabled = ko.observable(false);
		this.enabled.subscribe(function(val) {
			self.slider.set("enabled",!!val);
		});

		this.tracksVisualMode = ko.observable();
		this.cylindersVisualMode = ko.observable();
		this.modelsVisualMode = ko.observable();
		this.shortWayVisualMode = ko.observable();
		this.namesVisualMode = ko.observable();

//		this.trackVisualRadioGroup = new RadioGroup({data:this.tracksVisualMode,values:[{value:"10min",title:"10 min"},{value:"full",title:"Full"}]});
//		this.cylindersVisualRadioGroup = new RadioGroup({data:this.cylindersVisualMode,values:[{value:"full",title:"Full"},{value:"empty",title:"Empty"},{value:"off",title:"Off"}]});
//		this.modelsVisualRadioGroup = new RadioGroup({data:this.modelsVisualMode,values:[{value:"large",title:"Large"},{value:"medium",title:"Medium"},{value:"small",title:"Small"}]});
//		this.shortWayVisualRadioGroup = new RadioGroup({data:this.shortWayVisualMode,values:[{value:"wide",title:"Wide"},{value:"thin",title:"Thin"},{value:"off",title:"Off"}]});
/*
	<div class="airvis-row airvis-player-controls-titles airvis-clearfix">
		<div class="airvis-span120"><strong>Tracks</strong></div>
		<div class="airvis-span120"><strong>Cylinders</strong></div>
		<div class="airvis-span120"><strong>Short way</strong></div>
	</div>
	<div class="airvis-row airvis-clearfix">
		<div class="airvis-span120">
			<!-- ko widget: { data: trackVisualRadioGroup, type: "RadioGroup"} --><!-- /ko -->
		</div>
		<div class="airvis-span120">
			<!-- ko widget: { data: cylindersVisualRadioGroup, type: "RadioGroup"} --><!-- /ko -->
		</div>
		<div class="airvis-span120">
			<!-- ko widget: { data: shortWayVisualRadioGroup, type: "RadioGroup"} --><!-- /ko -->
		</div>
	</div>
	<div class="airvis-current-time">Race current time: <span data-bind="text: filters.formatTime(new Date(slider.val()))"></span></div>
*/

		this.trackVisualSelect = new Select({data:this.tracksVisualMode,label:"Tracks",values:[{value:"10min",title:"10 min"},{value:"full",title:"Full"},{value:"off",title:"Off"}]});
		this.cylindersVisualSelect = new Select({data:this.cylindersVisualMode,label:"Cylinders",values:[{value:"full",title:"Full"},{value:"empty",title:"Empty"},{value:"off",title:"Off"}]});
		this.modelsVisualSelect = new Select({data:this.modelsVisualMode,label:"Models",values:[{value:"large",title:"Large"},{value:"medium",title:"Medium"},{value:"small",title:"Small"}]});
		this.shortWayVisualSelect = new Select({data:this.shortWayVisualMode,label:"Shortest way",values:[{value:"wide",title:"Wide"},{value:"thin",title:"Thin"},{value:"off",title:"Off"}]});
		this.namesVisualSelect = new Select({data:this.namesVisualMode,label:"Names",values:[{value:"on",title:"On"},{value:"auto",title:"Auto"},{value:"off",title:"Off"}]});
		
		var fadeSelects = function(v) {
			var selects = ["trackVisualSelect","cylindersVisualSelect","modelsVisualSelect","shortWayVisualSelect","namesVisualSelect"];
			for (var i = 0; i < selects.length; i++)
				if (self[selects[i]] != v)
					self[selects[i]].fade();
		}

		var unfadeSelects = function() {
			var selects = ["trackVisualSelect","cylindersVisualSelect","modelsVisualSelect","shortWayVisualSelect","namesVisualSelect"];
			for (var i = 0; i < selects.length; i++)
				self[selects[i]].unfade();
		}

		this.trackVisualSelect.on("expand",fadeSelects).on("collapse",unfadeSelects);
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
		this.slider.set("val",ko.utils.unwrapObservable(time));
		this._timeKey(time);
		this._silence = false;
		return this;
	}

	PlayerControl.prototype.initTimeInterval = function(timeStart, timeFinish) {
		timeStart = ko.utils.unwrapObservable(timeStart);
		timeFinish = ko.utils.unwrapObservable(timeFinish);
		this.slider.set({
			min: timeStart,
			max: timeFinish,
			val: timeStart
		});
		this.enabled(true);
		return this;
	}

	PlayerControl.prototype.templates = ["main"];

	return PlayerControl;
});