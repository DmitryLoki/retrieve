define(['knockout', 'jquery-ui', 'widget!Slider'], function(ko, $, Slider){
	var PlayerControl = function(){
		this._state = ko.observable('play');
		this._speed = ko.observable(1);
		this.time = ko.observable(new Date);
		this.enabled = ko.observable();
		var self = this;
		this.enabled.subscribe(function(val){
			self._slider.slider({ disabled: !val });
			self.slider.set("enabled",!!val);
		});

		this.slider = new Slider({enabled:false});
		this.slider.on("change",function(val) { 
			self.setTimePos(val);
		});

		this._silence = false;
		this._dragging = false;
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
	
	PlayerControl.prototype.setTimePos = function(time){ //TODO: сделать через time()
		if(!this._dragging)
			this._slider.slider('value', time);
		this._silence = true;
		this.slider.set("value",time);
		this._silence = false;
		this.time(new Date(time));
		return this;
	};

	PlayerControl.prototype.initTimeInterval = function(timeStart, timeFinish){
		this._slider
		.slider('option', {
			min: timeStart,
			max: timeFinish
		})
		.slider('value', timeStart);
		this.time(new Date(timeStart));
		this.enabled(true);

		this.slider.set({
			min: timeStart,
			max: timeFinish,
			value: timeStart
		})

		return this;
	};

	PlayerControl.prototype.domInit = function(elem, params){
		var div = ko.virtualElements.firstChild(elem);
		while(div && div.nodeType != 1)
			div = ko.virtualElements.nextSibling(div);
		var self = this;
		this._slider = $(div).find('.player-control-slider')
		.slider({
			range: 'min',
			slide: function(event, ui){
				self.setTimePos(ui.value);
//				self.time(new Date(ui.value));
			},
			change: function(event, ui){
				if(!self._silence)
					self.emit('time', ui.value);
			},
			start: function(){
				self._dragging = true;
			},
			stop: function(){
				self._dragging = false;
			}
		});
		this.enabled(false);
	};

	PlayerControl.prototype.domDestroy = function(elem, params){
	};
	
	PlayerControl.prototype.templates = ['main'];

	return PlayerControl;
});
