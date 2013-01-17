define(['jquery','knockout','utils','EventEmitter','owg'],function(jquery,ko,utils,EventEmitter,OWG) {

	var owg = new OWG();

	// requestAnim shim layer by Paul Irish
    var requestAnimFrame = (function() {
      return  window.requestAnimationFrame       || 
              window.webkitRequestAnimationFrame || 
              window.mozRequestAnimationFrame    || 
              window.oRequestAnimationFrame      || 
              window.msRequestAnimationFrame     || 
              function(/* function */ callback, /* DOMElement */ element){
                window.setTimeout(callback, 1000 / 60);
              };
    })();

	// Аналог из GoogleMap/UFO, в идеале должен иметь те же методы что там
	var Ufo = function(params) {
		this._params = params;
		this._map = params.map;
		this._visible = true;
		this._animating = false;
		this.hasAsyncInit = true;
	}

	utils.extend(Ufo.prototype,EventEmitter.prototype);

	Ufo.prototype.asyncInit = function(callback) {
		var self = this;
		require([this._params.owgModelUrl],function(data) {
			self._params.owgModelJson = data.model;
			self._model = owg.ogCreateGeometry(self._map._waypointsLayer,data.model);
			callback();
		});
	}

	// Иконки не поддерживаются. TODO: можно вставить поддержку перегрузки модели
	Ufo.prototype.icon = function() {
		return this;
	}

	// TODO: еще подписи нужно уметь включать-выключать и треки
	Ufo.prototype._visibilityUpdate = function() {
		if (this._visible)
			owg.ogShowGeometry(this._model);
		else
			owg.ogHideGeometry(this._model);
	}

	Ufo.prototype.move = function(coords,duration) {
		var self = this;
		// При инициализации может не быть начального положения, тогда мгновенно туда переставляем и все
		// В owg перепутаны yaw и pitch. На самом деле yaw нужно указывать вторым параметром в setPosition и setOrientation
		if (!this._params.lat || !this._params.lng || !this._params.elevation) {
			this._params.lat = coords.lat;
			this._params.lng = coords.lng;
			this._params.elevation = coords.elevation;
			this._params.yaw = coords.yaw;

			//owg.ogSetGeometryPositionWGS84(this._model,this._params.lng,this._params.lat,this._params.elevation,0,0,0);
			//owg.ogSetGeometryOrientation(self._model,0,this._params.yaw,0);
			// TODO: дебагить owg. почему-то если много моделей, команды подряд setPosition + setOrientation, то вторая не срабатывает. 
			// Все парапланы в результате расположены параллельно с 0-м углом yaw.
			// А вот если сделать через таймаут, то почему-то работает.
			setTimeout(function() {
				self.move(coords);
			},1000);
			return this;
		}
		// Если уже идет анимация, значит она была запущена предыдущим кадром и мы не успели ее закончить.
		// В этом случае заканчиваем старую анимацию.
		if (this._animating) {
			this._animating = false;
			owg.ogSetGeometryPositionWGS84(this._model,this._params.lng,this._params.lat,this._params.elevation,0,0,0);
		}
		// Анимации нет. Если не указан duration, то просто мгновенно переставляем модель на новое положение и все.
		if (!duration || duration == 0) {
			this._params.lat = coords.lat;
			this._params.lng = coords.lng;
			this._params.elevation = coords.elevation;
			this._params.yaw = coords.yaw;
			owg.ogSetGeometryPositionWGS84(this._model,this._params.lng,this._params.lat,this._params.elevation,0,0,0);
			owg.ogSetGeometryOrientation(self._model,0,this._params.yaw,0);
			return this;
		}
		// Основной случай. Анимация указана.
		// animationStartCoords - стартовые координаты, с которых начинаем анимацию. 
		// В данный момент модель должна находится в этих координатах.
		this._animationStartCoords = {
			lat: this._params.lat,
			lng: this._params.lng,
			elevation: this._params.elevation,
			yaw: this._params.yaw
		}
		// в _params ставим конечные координаты. 
		// Как бы координаты уже проставлены, но фактическое положение модели запаздывает и придет в них после анимации.
		this._params.lat = coords.lat;
		this._params.lng = coords.lng;
		this._params.elevation = coords.elevation;
		this._params.yaw = coords.yaw;

		this._animationStartTime = (new Date).getTime();

		var animate = function() {
			var p = ((new Date).getTime() - self._animationStartTime) / duration;
			// Заканчиваем анимацию
			if (p >= 1) {
				p = 1;
				self._animating = false;
			}

			var yawDelta = self._params.yaw - self._animationStartCoords.yaw;
			if (yawDelta > 180) yawDelta -= 360;
			if (yawDelta < -180) yawDelta += 360;

			var coords = {
				lat: self._animationStartCoords.lat + (self._params.lat - self._animationStartCoords.lat) * p,
				lng: self._animationStartCoords.lng + (self._params.lng - self._animationStartCoords.lng) * p,
				elevation: self._animationStartCoords.elevation + (self._params.elevation - self._animationStartCoords.elevation) * p,
				yaw: self._animationStartCoords.yaw + yawDelta * p
			}

			owg.ogSetGeometryPositionWGS84(self._model,coords.lng,coords.lat,coords.elevation,0,0,0);
			owg.ogSetGeometryOrientation(self._model,0,coords.yaw,0);
			if (self._animating)
				requestAnimFrame(animate);
		}

		this._animating = true;
		animate();

		return this;
	}
	Ufo.prototype.visible = function(flag) {
		if (this._visible != flag) {
			this._visible = flag;
			this._visibilityUpdate();
		}
		return this;
	}
	Ufo.prototype.destroy = function() {
		this.emit("destroy");
	}




	var Waypoint = function(params) {
		params.color = "0,0,0,0.1";
		if (params.type == "start")
			params.color = "255,0,0,0.1";
		else if (params.type == "finish")
			params.color = "0,0,255,0.1";
		this._params = params;
		this._map = params.map;
		this._model = this.createCylinderGeometry();
	}

	utils.extend(Waypoint.prototype,EventEmitter.prototype);

	Waypoint.prototype.createCylinderGeometry = function() {
		var vertices = [], triangles = [];
		var color = this._params.color.split(",");
		for (var i = 0, step = 5; i < 360; i+= step) {
			var x = this._params.radius * Math.sin(i/180*Math.PI);
			var z = this._params.radius * Math.cos(i/180*Math.PI);
			vertices.push(x,this._params.height,z);
			for (var j = 0; j < color.length; j++)
				vertices.push(color[j]);
			vertices.push(x,0,z);
			for (var j = 0; j < color.length; j++)
				vertices.push(color[j]);
			if (i > 0) {
				var n = i/step*2;
				triangles.push(n-2,n-1,n,n-1,n+1,n);
			}
		}
		triangles.push(n,n+1,0,n+1,0,1);
		var geometry = [[{
			"Center": [this._params.lng,this._params.lat,0],
			"VertexSemantic": "pc",
			"Vertices": vertices,
			"IndexSemantic": "TRIANGLES",
			"Indices": triangles
		}]]

    	var cylinder = owg.ogCreateGeometry(this._map._waypointsLayer,geometry);
 	  	return cylinder;
	}

	Waypoint.prototype.destroy = function() {
		this.emit("destroy");
	}






	var OwgMap = function() {

/*
		TODO: вставить мегахак в owg насчет fullscreen и добавить-таки поддержку не fullscreen карты. 
		Пока что работает либо fullscreen, либо фиксированный размер
		this.width = ko.observable("320px");
		this.height = ko.observable("240px");
*/

		// owg не поддерживает передачу канваса в виде dom, обязательно нужен глобальный id
		this.canvasId = ko.observable("owgMapCanvasId");
		this.imgMap = { 
//			url: ["http://maps.kosmosnimki.ru/TileService.ashx?request=getTile&apikey=P8DQBF1TBW&LayerName=C9458F2DCB754CEEACC54216C7D1EB0A&lala=1"],
			url: ["https://khms1.google.com/kh/v=123&src=app&s=Gal"], 
			service: "goo"
		};
		this.cameraPosition = {
			latitude: 55.75,
			longitude: 37.60,
			elevation: 300,
			yaw: 0,
			pitch: -20,
			roll: 0
		}
		this.cameraLookAtPosition = {
			latitude: 55.75,
			longitude: 37.60,
			elevation: 0,
			distance: 1000			
		}
		this._ufos = [];
		this._waypoints = [];
/*
		TODO: добавить параметр bgColor, который должен задаваться в rgba(...), а затем парситься и вставляться в owg
		this.bgColor = ko.observable('rgba(0,0,0.5,1)');
		this.bgColor.subscribe(function(value) {
			if (this._ctx)
				owg.ogSetBackgroundColor(this._ctx,value);
		},this);
*/
/*	
		TODO: реагирование на ресайз - должны быть параметры this.width() и this.height(), которые пересчитываются при ресайзе,
		и они должны запускать ресайз owg если он не в режиме fullscreen (в fullscreen у owg уже прибинден внутренний onresize)
*/
	}

	OwgMap.prototype.setCameraPosition = function(p) {
		if (p && p.latitude) this.cameraPosition.latitude = p.latitude;
		if (p && p.longitude) this.cameraPosition.longitude = p.longitude;
		if (p && p.elevation) this.cameraPosition.elevation = p.elevation;
		if (p && p.yaw) this.cameraPosition.yaw = p.yaw;
		if (p && p.pitch) this.cameraPosition.pitch = p.pitch;
		if (p && p.roll) this.cameraPosition.roll = p.roll;

		// у owg дефолтное неопределенное значение = -1
		if (this._scene && this._scene != -1) {
			owg.ogSetPosition(
				this._camera,
				this.cameraPosition.longitude,
				this.cameraPosition.latitude,
				this.cameraPosition.elevation);
			owg.ogSetOrientation(
				this._camera,
				this.cameraPosition.yaw,
				this.cameraPosition.pitch,
				this.cameraPosition.roll);
		}

		// TODO: связать cameraPosition и cameraLookAtPosition, чтобы при простановке одного второе менялось соответственно
	}

	OwgMap.prototype.setCameraLookAtPosition = function(p) {
		if (p && p.latitude) this.cameraLookAtPosition.latitude = p.latitude;
		if (p && p.longitude) this.cameraLookAtPosition.longitude = p.longitude;
		if (p && p.elevation) this.cameraLookAtPosition.elevation = p.elevation;
		if (p && p.distance) this.cameraLookAtPosition.distance = p.distance;

		if (this._scene && this._scene != -1)
			owg.ogFlyToLookAtPosition(
				this._scene,
				this.cameraLookAtPosition.longitude,
				this.cameraLookAtPosition.latitude,
				this.cameraLookAtPosition.elevation,
				this.cameraLookAtPosition.distance);

		// TODO: связать cameraPosition и cameraLookAtPosition, чтобы при простановке одного второе менялось соответственно
	}

	OwgMap.prototype.ufo = function(params) {
		var self = this;
		params.map = self;
		var ufo = new Ufo(params);
		self._ufos.push(ufo);
		ufo.on("destroy",function() {
			self._ufos.splice(self._ufos.indexOf(ufo),1);
		});
		return ufo;
	}

	OwgMap.prototype.loadUfoAsync = function(params) {
		var self = this;
		params.map = self;
		require(params.owgModelUrl,function(json) {
			params.owgModelJson = json;
			var ufo = new Ufo(params);
			self._ufos.push(ufo);
			ufo.on("destroy",function() {
				self._ufos.splice(self._ufos.indexOf(ufo),1);
			});
			if (params.callback)
				params.callback(ufo);
		});
	}


	OwgMap.prototype.waypoint = function(params) {
		var self = this;
		params.map = self;
		var waypoint = new Waypoint(params);
		this._waypoints.push(waypoint);
		waypoint.on("destroy",function() {
			self._waypoints.splice(self._waypoints.indexOf(waypoint),1);
		});
		return waypoint;
	}

	OwgMap.prototype.domInit = function(elem,params) {
//		params.width && this.width(params.width);
//		params.height && this.height(params.height);

		// owg не поддерживает передачу dom-элементов, а работает только с id, поэтому нужно проставлять параметр canvasId
		params.canvasId && this.canvasId(params.canvasId);

		// если поставим вторым параметром true, картинка будет нормальная, 
		// но у дома canvas-а появятся атрибуты width и height, которые будут неверно вычислены в недрах owg. 
		// отрисуется все верно из-за того, что эти атрибуты перекрывают атрибуты style, в которые переданы observables width и height.
		// однако mouse hovers располагаются относительно неверно вычисленных width и height.
		// TODO: писать мегакостыль по owg engine3d.js #105. Нужно, чтобы fullscreen был не на fullscreen, а на размер парент-контейнера.
		// и при этом остался listener onresize, и ресайзил правильно. Можно накостылять через внутренние owg-offset-ы.
		this._ctx = owg.ogCreateContextFromCanvas(this.canvasId(),true);

		// Следующие две строки нельзя менять местами! this._scene = -1 если не создан globe (2 часа дебага)
		this._globe = owg.ogCreateGlobe(this._ctx);
		this._scene = owg.ogGetScene(this._ctx);
		this._world = owg.ogGetWorld(this._scene);
		this._camera = owg.ogGetActiveCamera(this._scene);
		this._waypointsLayer = owg.ogCreateGeometryLayer(this._world,"waypoints");
		this._ufosLayer = owg.ogCreateGeometryLayer(this._world,"ufos");

		owg.ogAddImageLayer(this._globe,this.imgMap);
		this.setCameraPosition();
	}

	OwgMap.prototype.templates = ["main"];

	return OwgMap;
});