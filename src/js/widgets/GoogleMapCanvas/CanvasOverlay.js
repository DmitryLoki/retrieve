define(["google.maps"], function(gmaps) {

	CanvasOverlay = function(params) {
	    this._map = params.map;
	    this._onMove = params.onMove;
	    this._mapDiv = this._map.getDiv();
	    this.setMap(this._map);
	}

	CanvasOverlay.prototype = new gmaps.OverlayView();

	CanvasOverlay.prototype.draw = function() { }

	CanvasOverlay.prototype._relayout = function() {
		var self = this;
		this._bounds = this._map.getBounds();
		this._corner = new gmaps.LatLng(this._bounds.getNorthEast().lat(), this._bounds.getSouthWest().lng());
		this._cornerPx = this._proj.fromLatLngToDivPixel(this._corner);
		this._cornerPx.x >>= 0;
		this._cornerPx.y >>= 0;
		this._mapCorner = this._map.getProjection().fromLatLngToPoint(this._corner);
		this._scale = 1 << this._map.getZoom();
		self._canvas.style.left = self._cornerPx.x + "px";
    	self._canvas.style.top = self._cornerPx.y + "px";
    	if(self._width !== self._mapDiv.offsetWidth || self._height !== self._mapDiv.offsetHeight){
    		var w = self._mapDiv.offsetWidth;
    		var h = self._mapDiv.offsetHeight;
    		self._canvas.width = w;
        	self._canvas.height = h;
        	self._width = w;
        	self._height = h;
    	}
    	this._onMove && this._onMove();
	}

	CanvasOverlay.prototype.onAdd = function() {
		this._canvas = document.createElement("canvas");
		this._context = this._canvas.getContext("2d");
		this._canvas.style.position = "absolute";
		this._canvas.style.pointerEvents = "none";
		this.getPanes().floatPane.appendChild(this._canvas);
		this._proj = this.getProjection();
    	this._relayout();
    	gmaps.event.addListener(this._map,"bounds_changed",this._relayout.bind(this));
	};

	CanvasOverlay.prototype.setTextProperties = function(properties) {
		if (!this._context) return;
		properties.text && (this._context.font = properties.text);
		properties.textBaseLine && (this._context.textBaseLine = properties.textBaseLine);
		properties.textAlign && (this._context.textAlign = properties.textAlign);
	}

	CanvasOverlay.prototype.clear = function() {
		if (!this._context) return;
		this._context.clearRect(0,0,this._width,this._height);
	}

	CanvasOverlay.prototype.onRemove = function() {
		// TODO
	};

	CanvasOverlay.prototype.absToRel = function(uniPx) {
		return { x: ((uniPx.x - this._mapCorner.x) * this._scale) >> 0, y: ((uniPx.y - this._mapCorner.y) * this._scale) >> 0 };
	};

	return CanvasOverlay;
});
