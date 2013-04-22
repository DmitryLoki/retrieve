define(["jquery","knockout","knockout.mapping"], function($,ko,komap) {

	var Slider = function(options) {
		var self = this;

		var defaults = {
			min: 0,
			max: 0,
			val: 0
		}

		self._dragging = false;
		self._val = ko.observable(options.val || 0);
		self._min = ko.observable(options.min || 0);
		self._max = ko.observable(options.max || 0);
		self.enabled = ko.observable(options.hasOwnProperty("enabled") ? options.enabled : true);
		self.containerWidth = 0;

		self.sliderPercent = ko.observable();

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

		self.valPercent.subscribe(function(val) {
			if (!self._dragging)
				self.sliderPercent(val);
		});

		// если val менялось снаружи через set-метод, событие change не эмитится
		// если val поменялось в результате дропа сладера при перетаскивании, происходит эмит
		self._silence = false;

		self.val.subscribe(function(val) {
			if (!self._silence)
				self.emit("change",val);
		});

		// Теперь при драге должны эмититься события о текущем положении слайдера
		self.sliderPercent.subscribe(function(p) {
			if (self._dragging) {
				var val = self.min()+p/100*(self.max()-self.min());
				self.emit("dragChange",val);
			}
		});
	}

	Slider.prototype.domInit = function(element, params, parentElement) {
		var div = ko.virtualElements.firstChild(element);
		while (div && div.nodeType != 1)
			div = ko.virtualElements.nextSibling(div);
		this.container = $(div).find(".slider");
	}

	Slider.prototype.dragStart = function(self,e) {
		e.stopPropagation();
		e.preventDefault();
		this._dragging = true;
		this.emit("dragStart");

		var w = this.container.width();
		if (!w || !(w>0)) return;
		var l = this.container.offset().left;
		if (!l || !(l>=0)) return;

		var mouseMove = function(e) {
			var p = (e.pageX-l)/w;
			if (p > 1) p = 1;
			if (p < 0) p = 0;
			self.sliderPercent(p*100);
		}

		$("body").addClass("airvis-document-overwrite-cursor-pointer");
		$(document).on("mousemove",mouseMove).one("mouseup mouseleave",function(e) {
			$("body").removeClass("airvis-document-overwrite-cursor-pointer");
			$(document).off("mousemove",mouseMove);
			self.val(Math.round(self.min() + self.sliderPercent() / 100 * (self.max() - self.min())));
			self._dragging = false;
			self.emit("dragEnd");
		});

		mouseMove(e);
		this.sliderPercent.valueHasMutated();
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