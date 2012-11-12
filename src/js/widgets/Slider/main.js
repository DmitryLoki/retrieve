define(["knockout","knockout.mapping","jquery"], function(ko,komap,$) {

	var Slider = function(options) {
		var self = this;

		self._dragging = false;

		var defaults = {
			enabled: true,
			min: 0,
			max: 0,
			value: 0
		}
		komap.fromJS($.extend(true,{},defaults,options),{},this);

		this.offset = ko.computed(function() {
			// self.container - это DOM-элемент class=slider в шаблоне, получаем его в domInit
			var totalWidth = self.container && self.container.length > 0? self.container.width() : 0;
			return parseInt((self.value()-self.min())/(self.max()-self.min())*totalWidth);
		});

		this.value.subscribe(function(val) {
			self.emit("change",val);
		});

		this.hoverOn = function(m,e) {
			$(e.target).addClass("ui-state-hover");
		}
		this.hoverOff = function(m,e) {
			$(e.target).removeClass("ui-state-hover");
		}
		this.dragStart = function(m,e) {
			self.emit("slideStart");
			var oX = e.pageX;
			var sX = $(e.target).position().left;
			$(document).on("mousemove.SLIDER",function(e) {
				self.emit("slide",e.pageX - oX + sX);
				var val = parseInt((e.pageX - oX + sX) / self.container.width() * (self.max() - self.min()) + self.min());
				self.value(val);
			}).on("mouseup.SLIDER",function(e) {
				self.emit("slideStop");
				$(document).off(".SLIDER");
			});
		}
		this.set = function() {
			var data = {};
			if (arguments.length == 2 && typeof arguments[0] == "string")
				data[arguments[0]] = arguments[1];
			else if (arguments.length == 1)
				data = arguments[0];

			komap.fromJS(data,{},this);
		}
		this.domInit = function(elem, params) {
			self.container = $(elem.parentElement).find(".slider");
		}
	}

	Slider.prototype.templates = ["main"];

	return Slider;
});
