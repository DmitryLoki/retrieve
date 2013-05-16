define(["jquery","knockout"], function($,ko) {
	var Slider = function(options) {
		var self = this;

		this.min = options.min;
		this.max = options.max;
		this.val = options.val;
		this.drag = options.drag;
		this.dragging = options.dragging;

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
		var w = this.container.width();
		if (!w || !(w>0)) return;
		var l = this.container.offset().left;
		if (!l || !(l>=0)) return;
		self.dragging(true);
		var mouseMove = function(e) {
			var p = (e.pageX-l)/w;
			if (p > 1) p = 1;
			if (p < 0) p = 0;
			self.drag(self.min()+(self.max()-self.min())*p);
		}
		$("body").addClass("airvis-document-overwrite-cursor-pointer");
		$(document).on("mousemove",mouseMove).one("mouseup mouseleave",function(e) {
			$("body").removeClass("airvis-document-overwrite-cursor-pointer");
			$(document).off("mousemove",mouseMove);
			self.emit("change",self.drag());
			self.dragging(false);
		});
		mouseMove(e);
	}

	Slider.prototype.templates = ["main"];

	return Slider;
});