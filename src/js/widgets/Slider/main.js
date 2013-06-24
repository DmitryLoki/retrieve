define(["jquery","knockout"], function($,ko) {
	var Slider = function(options) {
		var self = this;

		this.min = options.min;
		this.max = options.max;
		this.val = options.val;
		this.drag = options.drag;
		this.dragging = options.dragging;
		this.handleMode = options.handleMode;

		this.val.subscribe(function(val) {
			if (!self.dragging())
				self.drag(val);
		});

		this.valPercent = ko.computed(function() {
				var delta = self.max() - self.min();
				return delta > 0 ? Math.floor(100*(self.val()-self.min())/delta) : self.min();
		});

		this.dragPercent = ko.computed(function() {
				var delta = self.max() - self.min();
				return delta > 0 ? Math.floor(100*(self.drag()-self.min())/delta) : self.min();
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
		var eventType = e.type.match(/^touch/) ? "touch" : "mouse";

		var w = this.container.width();
		if (!w || !(w>0)) return;
		var l = this.container.offset().left;
		if (!l || !(l>=0)) return;
		self.dragging(true);

		var getEventCoords = function(e,eventType) {
			if (eventType == "touch") {
				if (e.originalEvent) e = e.originalEvent;
				if (e.touches && e.touches.length > 0)
					return {pageX:e.touches[0].clientX,pageY:e.touches[0].clientY};
				if (e.changedTouches && e.changedTouches.length > 0)
					return {pageX:e.changedTouches[0].clientX,pageY:e.changedTouches[0].clientY};
				if (e.targetTouches && e.targetTouches.length > 0)
					return {pageX:e.targetTouches[0].clientX,pageY:e.targetTouches[0].clientY};
			}
			else
				return {pageX:e.pageX,pageY:e.pageY};
		}

		var mouseMove = function(e) {
			e = getEventCoords(e,eventType);
			var p = (e.pageX-l)/w;
			if (p > 1) p = 1;
			if (p < 0) p = 0;
			self.drag(self.min()+(self.max()-self.min())*p);
		}
		$("body").addClass("airvis-document-overwrite-cursor-pointer");
		$(document).on("mousemove touchmove",mouseMove).one("mouseup mouseleave touchend touchcancel",function(e) {
			$("body").removeClass("airvis-document-overwrite-cursor-pointer");
			$(document).off("mousemove touchmove",mouseMove);
			self.emit("change",self.drag());
			self.dragging(false);
		});
		mouseMove(e);
	}

	Slider.prototype.templates = ["main"];

	return Slider;
});