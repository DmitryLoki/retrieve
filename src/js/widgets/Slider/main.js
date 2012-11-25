define(["jquery","knockout","knockout.mapping"], function($,ko,komap) {

	var Slider = function(options) {
		var self = this;

		var defaults = {
			enabled: true,
			min: 0,
			max: 0,
			val: 0
		}

		var options = $.extend(true,{},defaults,options);

		self._dragging = false;
		self._val = ko.observable(options.val);
		self._min = ko.observable(options.min);
		self._max = ko.observable(options.max);
		self.enabled = ko.observable(options.enabled);

		// генератор случайного имени
		// TODO: заменить на нормальный библиотечный аналог или вынести в widget
		self.uniqId = function() {
			if (this._uniqId)
				return this._uniqId;
			this._uniqId = "uniqId" + (new Date()).getTime().toString() + parseInt(1000*Math.random()).toString();
			return this._uniqId;
		}

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

		// именно изменение внутреннего параметра _val вызывает change,
		// потому что если привязать на внешнее val, который во внешнем коде будет синхронизироваться и
		// в итоге опять проставлять val, код зациклится
		self._val.subscribe(function(val) {
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

		self.percent = ko.computed({
			read: function() {
				// теперь смещение слайдера будет задаваться в %-х от общей ширины, с точностью до .xx
				var totalWidth = 100;
				if (self.max() == self.min()) return totalWidth;
				return Math.round((self.val()-self.min())/(self.max()-self.min())*totalWidth*100)/100;
			},
			write: function(val) {
				var parsedValue = parseFloat(val);
				val = isNaN(parsedValue) ? 0 : parsedValue;
				self.val(Math.round(self.min() + val / 100 * (self.max() - self.min())));
			}
		});

		self.dragStart = function(m,e) {
			if (!self.enabled()) return false;
			self.emit("drag",self.val());
			self._dragging = true;
			self._dragStartPercent = self.percent();
			self._dragStartEvent = e;
		}

		self.dragEnd = function() {
			if (self._dragging)
				self.emit("drop",self.val());
			self._dragging = false;
		}

		self.forward = function() {
			self.val(self.max());
		}

		self.backward = function() {
			self.val(self.min());
		}

		self.set = function() {
			var data = {};
			if (arguments.length == 2 && typeof arguments[0] == "string")
				data[arguments[0]] = arguments[1];
			else if (arguments.length == 1)
				data = arguments[0];
			komap.fromJS(data,{},self);
			// Данные могут прийти в произвольном порядке. Например, первым элементом приходит val. 
			// Оно проверяется с max, а max в этот момент=0, тогда значение val проставляется в 0 вместо нужного.
			// В итоге нужно перепроставить его после komap-а.
			if (data.hasOwnProperty("val"))
				self.val(data.val);
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
			var div = ko.virtualElements.firstChild(elem);
			while (div && div.nodeType != 1)
				div = ko.virtualElements.nextSibling(div);
			var container = $(div).find(".slider");
			var containerWidth = container.width();

			$(document).on("mousedown.SLIDER"+self.uniqId(),function(e) {
				if (self._dragging) {
					containerWidth = container.width();
				}
			}).on("mousemove.SLIDER"+self.uniqId(),function(e) {
				if (self._dragging) {
					// смещение в пикселях x-положения мыши от того места, где был mousedown
					var pxMouseOffset = e.pageX - self._dragStartEvent.pageX;
					// стартовое смещение бегунка в пикселях
					var pxStartOffset = self._dragStartPercent*containerWidth/100;
					// смещение бегунка, какое оно теперь должно быть, но в пикселях
					var pxOffset = pxStartOffset + pxMouseOffset;
					// смещение бегунка в %-х относительно общей ширины контейнера
					self.percent(containerWidth ? pxOffset / containerWidth * 100 : 0);
				}
			}).on("mouseup.SLIDER"+self.uniqId(),function(e) {
				if (self._dragging) {
					self.dragEnd();
				}
			});
		}

		self.domDestroy = function(elem,val) {
			$(document).off(".SLIDER"+self.uniqId());
		}
	}

	Slider.prototype.templates = ["main"];

	return Slider;
});
