define(["jquery","knockout","jquery-ui"],function($,ko) {

	var Window = function(options) {
		var self = this;

		var defaults = {
			showHeader: true,
			visible: true,
			resizable: true, 
			contentCss: "",
			title: "",
			nodes: [],
			width: 300,
			height: "auto",
			top: 0,
			left: 0,
			minWidth: 100,
			minHeight: 50
		}

		if (!options) options = {};

		self.showHeader = this.asObservable(options.showHeader,defaults.showHeader);
		self.visible = this.asObservable(options.visible,defaults.visible);
		self.resizable = this.asObservable(options.resizable,defaults.resizable);
		self.contentCss = this.asObservable(options.contentCss,defaults.contentCss);
		self.title = this.asObservable(options.title,defaults.title);
		self.width = this.asObservable(options.width,defaults.width);
		self.height = this.asObservable(options.height,defaults.height);
		self.top = this.asObservable(options.top,defaults.top);
		self.left = this.asObservable(options.left,defaults.left);
		self.minWidth = this.asObservable(options.minWidth,defaults.minWidth);
		self.minHeight = this.asObservable(options.minHeight,defaults.minHeight);

		self.nodes = ko.observableArray(defaults.nodes);
		self.css = ko.observable({});

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
	}

	Window.prototype.hide = function() {
		this.visible(false);
	}

	Window.prototype.domInit = function(element,params,parentElement) {
		if (params.data.savedNodes)
			this.nodes(params.data.savedNodes);
		if (params.contentCss)
			this.contentCss(params.contentCss);

		var div = ko.virtualElements.firstChild(element);
		while (div && div.nodeType != 1)
			div = ko.virtualElements.nextSibling(div);

		if (div) {
			var obj = $(div);
			this.width(obj.width());
			this.height(obj.height());
			var content = obj.find(".airvis-window-content");
			var position = content.position();
			content.addClass("airvis-window-content-absolute").css({top:position.top+"px",left:position.left+"px"});
		}
	}

	Window.prototype.asObservable = function(v,defaultV) {
		if (ko.isObservable(v) || ko.isComputed(v)) return v;
		return ko.observable(typeof v == "function" ? v() : (typeof v == "undefined" ? defaultV : v));
	}

	Window.prototype.dragStart = function(self,e) {
		this.emit("dragStart",self,e);
	}

	Window.prototype.resizeStart = function(dir,self,e) {
		this.emit("resizeStart",dir,self,e);
	}

	Window.prototype.templates = ["main"];

	return Window;
});