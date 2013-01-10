define(["jquery","knockout","knockout.mapping"], function($,ko,komap) {

	var Slider = function(options) {
		var self = this;

		self._dragging = false;
		self._val = ko.observable(options.val || 0);
		self._min = ko.observable(options.min || 0);
		self._max = ko.observable(options.max || 0);
		self.enabled = ko.observable(options.hasOwnProperty("enabled") ? options.enabled : true);
		self.containerWidth = 0;

		self.val = ko.computed({
			read: function() {
				return self._val();
			},
			write: function(val) {
				var parsedValue = parseFloat(val);
				val = isNaN(parsedValue) ? defaults.val : parsedValue;
				if (val < self.min())
					val = self.min();
				if (val > self.max())
					val = self.max();
				self._val(val);
			}
		});

		// если val менялось снаружи через set-метод, событие change не эмитится
		// если val поменялось в результате дропа сладера при перетаскивании, происходит эмит
		self._silence = false;

		self.val.subscribe(function(val) {
			if (!self._silence)
				self.emit("change",val);
		})

		self.min = ko.computed({
			read: function() {
				return self._min();
			},
			write: function(val) {
				var parsedValue = parseFloat(val);
				val = isNaN(parsedValue) ? defaults.min : parsedValue;
				if (val > self.max())
					self.max(val);
				if (val > self.val())
					self.val(val);
				self._min(val);
			}
		});

		self.max = ko.computed({
			read: function() {
				return self._max();
			},
			write: function(val) {
				var parsedValue = parseFloat(val);
				val = isNaN(parsedValue) ? defaults.max : parsedValue;
				if (val < self.min())
					self.min(val);
				if (val < self.val())
					self.val(val);
				self._max(val);
			}
		});

		self.valPercent = ko.computed(function() {
			// теперь смещение слайдера будет задаваться в %-х от общей ширины, с точностью до .xx
			var totalWidth = 100;
			if (self.max() == self.min()) return totalWidth;
			return Math.round((self.val()-self.min())/(self.max()-self.min())*totalWidth*100)/100;
		});

		self.sliderPercent = ko.observable();

		self.valPercent.subscribe(function(val) {
			if (!self._dragging)
				self.sliderPercent(val);
		});

		var documentMouseMove = function(e) {
			if (self._dragging) {
				// смещение в пикселях x-положения мыши от того места, где был mousedown
				var pxMouseOffset = e.pageX - self._dragStartEvent.pageX;
				// стартовое смещение бегунка в пикселях
				var pxStartOffset = self._dragStartPercent*self.containerWidth/100;
				// смещение бегунка, какое оно теперь должно быть, но в пикселях
				var pxOffset = pxStartOffset + pxMouseOffset;
				// смещение бегунка в %-х относительно общей ширины контейнера
				var percentOffset = self.containerWidth ? pxOffset / self.containerWidth * 100 : 0;
				if (percentOffset > 100) percentOffset = 100;
				if (percentOffset < 0) percentOffset = 0;
				// простановка значения относительно max-min
				self.sliderPercent(percentOffset);
			}
		}

		var documentMouseUp = function(e) {
			if (self._dragging) {
				self.dragEnd();
			}
		}

		self.domInit = function(elem, params, parentElement) {
			// Мы никак не можем обойтись без контейнера, нам нужна его ширина
			// Причина в том, что даже если оффсет бегунка задан в %-х, событие mousemove работает в пикселях, 
			// и приходится пересчитывать px-смещение мыши в %-е смещение бегунка
			// Более того, мы не можем один раз и навсегда в domInit запомнить ширину контейнера, потому что 
			// она может меняться, например, при ресайзе окна.
			// Но заново высчитывать container.width() при каждом mousemove слишком накладно. 
			// Будем считать, что пока кнопка мыши зажата, размеры контейнера постоянны, 
			// т.е. будем пересчитывать width один раз на каждый mousedown.
			// а теперь упростим еще, считаем, что ширина вообще не меняется, и считаем ее один раз при инициализации
			var div = ko.virtualElements.firstChild(elem);
			while (div && div.nodeType != 1)
				div = ko.virtualElements.nextSibling(div);
			self.containerWidth = $(div).find(".slider").width();
			$(document).on("mousemove",documentMouseMove).on("mouseup",documentMouseUp);
		}

		self.domDestroy = function(elem,val) {
			$(document).off("mousemove",documentMouseMove).off("mouseup",documentMouseUp);
		}

	}

	Slider.prototype.dragStart = function(m,e) {
		if (!this.enabled()) return false;
		this.emit("drag",this.val());
		this._dragging = true;
		this._dragStartPercent = this.sliderPercent();
		this._dragStartEvent = e;
	}

	Slider.prototype.dragEnd = function() {
		if (!this._dragging) return false;
		this.val(Math.round(this.min() + this.sliderPercent() / 100 * (this.max() - this.min())));
		this.emit("drop",this.val());
		this._dragging = false;
	}

	Slider.prototype.forward = function() {
		this.val(this.max());
	}

	Slider.prototype.backward = function() {
		self.val(self.min());
	}

	Slider.prototype.set = function() {
		this._silence = true;
		var data = {};
		if (arguments.length == 2 && typeof arguments[0] == "string")
			data[arguments[0]] = arguments[1];
		else if (arguments.length == 1)
			data = arguments[0];
		komap.fromJS(data,{},this);
		// Данные могут прийти в произвольном порядке. Например, первым элементом приходит val. 
		// Оно проверяется с max, а max в этот момент=0, тогда значение val проставляется в 0 вместо нужного.
		// В итоге нужно перепроставить его после komap-а.
		if (data.hasOwnProperty("val"))
			this.val(data.val);
		this._silence = false;
	}

	Slider.prototype.templates = ["main"];

	return Slider;
});