define(['knockout', 'widget!Slider'], function(ko, Slider){
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