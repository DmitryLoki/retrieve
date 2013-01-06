define(['jquery','knockout','utils','EventEmitter','owg'],function(jquery,ko,utils,EventEmitter,OWG) {

	var owg = new OWG();

	var OwgMap = function() {
		this.width = ko.observable('320px');
		this.height = ko.observable('240px');
		this.canvasId = ko.observable('owgMapCanvasId');
		this.imgMap = { 
//			url: ["http://maps.kosmosnimki.ru/TileService.ashx?request=getTile&apikey=P8DQBF1TBW&LayerName=C9458F2DCB754CEEACC54216C7D1EB0A&lala=1"],
			url: ["https://khms1.google.com/kh/v=123&src=app&s=Gal"], 
			service: "goo"
		};
		this.cameraPosition = {
			latitude: 55.75,
			longitude: 37.60,
			elevation: 500,
			yaw: 165,
			pitch: -10,
			roll: 0
		}
/*
		TODO: 
		this.bgColor = ko.observable('rgba(0,0,0.5,1)');
		this.bgColor.subscribe(function(value) {
			if (this._ctx)
				owg.ogSetBackgroundColor(this._ctx,value);
		},this);
*/
/*	
		TODO: реагирование на ресайз
*/
	}

	OwgMap.prototype.setCameraPosition = function(p) {
		if (p && p.latitude) this.cameraPosition.latitude = p.latitude;
		if (p && p.longitude) this.cameraPosition.longitude = p.longitude;
		if (p && p.elevation) this.cameraPosition.elevation = p.elevation;
		if (p && p.yaw) this.cameraPosition.yaw = p.yaw;
		if (p && p.pitch) this.cameraPosition.pitch = p.pitch;
		if (p && p.roll) this.cameraPosition.roll = p.roll;
		if (this._scene && this._scene != -1) {
			console.log(this.cameraPosition,this._scene);
 //		     owg.ogFlyTo(this._scene,9.821343,46.793029,8000); //scene,longitude,latitude,elevation
 		     owg.ogFlyToLookAtPosition(this._scene,7.591127,47.550558,300,10000); //scene,longitude,latitude,elevation,distance in [m]
 

//			owg.ogFlyTo(this._scene,this.cameraPosition.longitude,this.cameraPosition.latitude,this.cameraPosition.elevation,this.cameraPosition.yaw,this.cameraPosition.pitch,this.cameraPosition.roll);
		}
	}

	OwgMap.prototype.domInit = function(elem,params) {
		params.width && this.width(params.width);
		params.height && this.height(params.height);

		// owg не поддерживает передачу dom-элементов, а работает только с id, поэтому нужно проставлять параметр canvasId
		params.canvasId && this.canvasId(params.canvasId);

		// если поставим вторым параметром true, картинка будет нормальная, 
		// но у дома canvas-а появятся атрибуты width и height, которые будут неверно вычислены в недрах owg. 
		// отрисуется все верно из-за того, что эти атрибуты перекрывают атрибуты style, в которые переданы observables width и height.
		// однако mouse hovers располагаются относительно неверно вычисленных width и height.
		// TODO: писать мегакостыль по owg engine3d.js #105. Нужно, чтобы fullscreen был не на fullscreen, а на размер парент-контейнера.

		this._ctx = owg.ogCreateContextFromCanvas(this.canvasId());

		// Следующие две строки нельзя менять местами! this._scene = -1 если не создан globe (2 часа дебага)
		this._globe = owg.ogCreateGlobe(this._ctx);
		this._scene = owg.ogGetScene(this._ctx);

		owg.ogAddImageLayer(this._globe,this.imgMap);
		this.setCameraPosition();
	}

	OwgMap.prototype.templates = ['main'];

	return OwgMap;
});