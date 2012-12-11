define(["jquery","knockout","jquery-ui"],function($,ko) {

	var Window = function(options) {
		var self = this;

		var defaults = {
			title: "",
			nodes: [],
			width: 300,
			top: 0,
			left: 0
		}
		if (!options) options = {};

		self.title = ko.observable(defaults.title);
		self.nodes = ko.observableArray(defaults.nodes);
		self.width = ko.observable(defaults.width);
		self.top = ko.observable(defaults.top);
		self.left = ko.observable(defaults.left);

		self.dragStart = function(m,e) {
			self._dragging = true;
			self._dragStartEvent = e;	
			self._dragStartPosition = {top: self.top(), left: self.left()};
		}

		self.dragEnd = function() {
			self._dragging = false;			
		}

		var documentMouseMove = function(e) {
			if (self._dragging) {
				self.top(self._dragStartPosition.top + e.pageY - self._dragStartEvent.pageY);
				self.left(self._dragStartPosition.left + e.pageX - self._dragStartEvent.pageX);
			}
		}

		var  documentMouseUp = function(e) {
			self.dragEnd();
		}

		self.cssPosition = ko.computed(function() {
			return {
				width: self.width() + "px",
				top: self.top() + "px",
				left: self.left() + "px"
			}
		});

		self.domInit = function(elem,params,parentElement) {
			var v = "title top left width".split(/ /);
			for (var i = 0; i < v.length; i++)
				self[v[i]](options[v[i]] || params[v[i]] || defaults[v[i]]);
			if (self.nodes().length == 0 && params.data.savedNodes)
				self.nodes(params.data.savedNodes);
			$(document).on("mousemove",documentMouseMove).on("mouseup",documentMouseUp);
		}
		self.domDestroy = function(elem,val) {
			$(document).off("mousemove",documentMouseMove).off("mouseup",documentMouseUp);
		}
	}

	Window.prototype.templates = ["main"];

	return Window;
});