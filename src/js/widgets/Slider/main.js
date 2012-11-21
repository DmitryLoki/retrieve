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

		self.val = ko.computed({
			read: function() {
				return self._val();
			},
			write: function(val) {
				var parsedValue = parseFloat(val);
				val = isNaN(parsedValue) ? 0 : parsedValue;
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
				val = isNaN(parsedValue) ? 0 : parsedValue;
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
				val = isNaN(parsedValue) ? 0 : parsedValue;
				if (val < self.min())
					self.min(val);
				if (val < self.val())
					self.val(val);
				self._max(val);
			}
		});

		self.offset = ko.computed(function() {
			// self.container - это DOM-элемент class=slider в шаблоне, получаем его в domInit
			var totalWidth = self.container && self.container.length > 0? self.container.width() : 0;
			if (self.max() == self.min()) return totalWidth;
			return Math.round((self.val()-self.min())/(self.max()-self.min())*totalWidth);
		});

		self.hoverOn = function(m,e) {
			if (!self.enabled()) return false;
			$(e.target).addClass("ui-state-hover");
		}

		self.hoverOff = function(m,e) {
			$(e.target).removeClass("ui-state-hover");
		}

		self.dragStart = function(m,e) {
			if (!self.enabled()) return false;
			self.emit("drag",ko.utils.unwrapObservable(self.val()));
			self._dragging = true;
			var oX = e.pageX;
			var sX = $(e.target).position().left;
			$(document).on("mousemove.SLIDER",function(e) {
				self.emit("slide",e.pageX - oX + sX);
				var val = 0;
				if (self.container && self.container.length > 0 && self.container.width() > 0)
					val = parseInt((e.pageX - oX + sX) / self.container.width() * (self.max() - self.min()) + self.min());
				self.val(val);
			}).on("mouseup.SLIDER",function(e) {
				self.dragEnd();
			});
		}

		self.dragEnd = function() {
			if (self._dragging)
				self.emit("drop",ko.utils.unwrapObservable(self.val()));
			$(document).off(".SLIDER");
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
			var div = ko.virtualElements.firstChild(elem);
			while (div && div.nodeType != 1)
				div = ko.virtualElements.nextSibling(div);
			self.container = $(div).find(".slider");
		}
	}

	Slider.prototype.templates = ["main"];

	return Slider;
});
