define(["google.maps"],function(gmaps) {

	var CanvasOverlay = function(options) {
		this._map = options.map;
		this._mapDiv = this._map.getDiv();
		this.setMap(this._map);
	}
	CanvasOverlay.prototype = new gmaps.OverlayView();

	CanvasOverlay.prototype.relayout = function() {
		if (!this._mapDiv) return;
		if (this._width != this._mapDiv.offsetWidth || this._height != this._mapDiv.offsetHeight) {
			this._width = this._mapDiv.offsetWidth;
			this._height = this._mapDiv.offsetHeight;
			if (this._canvas) {
				this._canvas.width = this._width;
				this._canvas.height = this._height;
			}
		}
		this._bounds = this._map.getBounds();
		this._corner = new gmaps.LatLng(this._bounds.getNorthEast().lat(), this._bounds.getSouthWest().lng());
		this._mapCorner = this._map.getProjection().fromLatLngToPoint(this._corner);
	}

	CanvasOverlay.prototype.clear = function() {
		if (!this._context) return;
		this._context.clearRect(0,0,this._width,this._height);
	}


	CanvasOverlay.prototype.onAdd = function() {
		this._canvas = document.createElement("canvas");
		this._canvas.style.pointerEvents = "none";
		this._context = this._canvas.getContext("2d");
		this._proj = this._map.getProjection();
		this._map.controls[gmaps.ControlPosition.TOP_CENTER].push(this._canvas);
		this.relayout();
	}

	CanvasOverlay.prototype.onRemove = function() {
		if (this._canvas)
			this._canvas.parentNode.removeChild(this._canvas);
	}

	CanvasOverlay.prototype.getCanvas = function() {
		return this._canvas;
	}

	CanvasOverlay.prototype.getContext = function() {
		return this._context;
	}

	CanvasOverlay.prototype.draw = function() {
		console.log("CanvasOverlay.Draw");
		this.relayout();
	}

	CanvasOverlay.prototype.setProperties = function(properties) {
		if (!this._context) return;
		for (var i in properties)
			if (properties.hasOwnProperty(i))
				this._context[i] = properties[i];
	}

	CanvasOverlay.prototype.abs2rel = function(uniPx,zoom) {
		var scale = 1 << zoom;
		return { x: ((uniPx.x - this._mapCorner.x) * scale) >> 0, y: ((uniPx.y - this._mapCorner.y) * scale) >> 0 };
	}

	CanvasOverlay.prototype.inViewport = function(center,radius) {
		if (center.x + radius < 0 || center.x - radius > this._width) return false;
		if (center.y + radius < 0 || center.y - radius > this._height) return false;
		return true;
	}

	return CanvasOverlay;
});