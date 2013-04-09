define(['knockout', 'widget!Slider', 'widget!RadioGroup'], function(ko, Slider, RadioGroup){
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

		this.trackVisualRadioGroup = new RadioGroup({data:this.tracksVisualMode,values:[{value:"10min",title:"10 min"},{value:"full",title:"Full"}]});
		this.cylindersVisualRadioGroup = new RadioGroup({data:this.cylindersVisualMode,values:[{value:"full",title:"Full"},{value:"empty",title:"Empty"},{value:"off",title:"Off"}]});
		this.modelsVisualRadioGroup = new RadioGroup({data:this.modelsVisualMode,values:[{value:"large",title:"Large"},{value:"medium",title:"Medium"},{value:"small",title:"Small"}]});
		this.shortWayVisualRadioGroup = new RadioGroup({data:this.shortWayVisualMode,values:[{value:"wide",title:"Wide"},{value:"thin",title:"Thin"},{value:"off",title:"Off"}]});

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