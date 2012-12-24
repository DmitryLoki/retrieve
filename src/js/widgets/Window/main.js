define(["jquery","knockout","jquery-ui"],function($,ko) {

	var Window = function(options) {
		var self = this;

		var defaults = {
			title: "",
			nodes: [],
			width: 300,
			height: "auto",
			top: 0,
			left: 0
		}
		if (!options) options = {};

		self.width = ko.observable(defaults.width);
		self.height = ko.observable(defaults.height);
		self.top = ko.observable(defaults.top);
		self.left = ko.observable(defaults.left);
		self.title = ko.observable(defaults.title);
		self.nodes = ko.observableArray(defaults.nodes);

		self.cssPosition = ko.computed(function() {
			var out = {};
			if (self.width()) 
				out.width = self.width() + (self.width()=="auto"?"":"px");
			if (self.height()) 
				out.height = self.height() + (self.height()=="auto"?"":"px");
			if (self.top()) 
				out.top = self.top() + (self.top()=="auto"?"":"px");
			if (self.left()) 
				out.left = self.left() + (self.left()=="auto"?"":"px");
			return out;
		});

		var documentMouseMove = function(e) {
			if (self._dragging) {
				self.top(self._dragStartPosition.top + e.pageY - self._dragStartEvent.pageY);
				self.left(self._dragStartPosition.left + e.pageX - self._dragStartEvent.pageX);
			}
		}

		var  documentMouseUp = function(e) {
			self.dragEnd();
		}

		self.domInit = function(elem,params,parentElement) {
			self.width(options.width || params.width || defaults.width);
			self.height(options.height || params.height || defaults.height);
			self.top(options.top || params.top || defaults.top);
			self.left(options.left || params.left || defaults.left);
			self.title(options.title || params.title || defaults.title);
			self.nodes(options.nodes || params.data.savedNodes || defaults.nodes);
			$(document).on("mousemove",documentMouseMove).on("mouseup",documentMouseUp);
		}

		self.domDestroy = function(elem,val) {
			$(document).off("mousemove",documentMouseMove).off("mouseup",documentMouseUp);
		}
	}

	Window.prototype.dragStart = function(m,e) {
		this._dragging = true;
		this._dragStartEvent = e;
		this._dragStartPosition = {top: this.top(), left: this.left()};
	}

	Window.prototype.dragEnd = function(m,e) {
		this._dragging = false;
	}

	Window.prototype.templates = ["main"];

	return Window;
});