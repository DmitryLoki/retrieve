define(['knockout', 'widget!Slider'], function(ko, Slider){
	var PlayerControl = function(){
		this._state = ko.observable('play');
		this._speed = ko.observable(1);
		this.time = ko.observable(new Date);
		this.enabled = ko.observable();
		var self = this;
		this.enabled.subscribe(function(val){
			self.slider.set("enabled",!!val);
		});

		this.slider = new Slider({enabled:false});
		this.slider.on("change",function(val) { 
			self.setTimePos(val);
		}).on("drop",function(val) {
			self.emit("drop",val);
		});
	};

	PlayerControl.prototype.getState = function(){
		return this._state();
	};

	PlayerControl.prototype.playClick = function(){
		if(this._state() != 'play'){
			this._state('play');
			this.emit('play');
		}
	};
	
	PlayerControl.prototype.pauseClick = function(){
		if(this._state() != 'pause'){
			this._state('pause');
			this.emit('pause');
		}
	};

	PlayerControl.prototype.speed1Click = function(){
		if(this._speed() != 1){
			this._speed(1);
			this.emit('speed', 1);
		}
	};

	PlayerControl.prototype.speed10Click = function(){
		if(this._speed() != 10){
			this._speed(10);
			this.emit('speed', 10);
		}
	};

	PlayerControl.prototype.speed25Click = function(){
		if(this._speed() != 25){
			this._speed(25);
			this.emit('speed', 25);
		}
	};
	
	PlayerControl.prototype.setTimePos = function(time) { //TODO: сделать через time()
		this.slider.set("val",time);
		this.time(new Date(time));
		return this;
	};

	PlayerControl.prototype.initTimeInterval = function(timeStart, timeFinish){
		this.time(new Date(timeStart));
		this.enabled(true);
		this.slider.set({
			min: timeStart,
			max: timeFinish,
			val: timeStart
		});
		return this;
	};

	PlayerControl.prototype.domInit = function(elem, params){
		this.enabled(false);
	};

	PlayerControl.prototype.domDestroy = function(elem, params){
	};
	
	PlayerControl.prototype.templates = ['main'];

	return PlayerControl;
});
