define({
	width: "100%",
	height: "100%",
	mode: "full",
	mapWidget: "2d",
	imgRootUrl: "/img/",
	icons: {
		"flymedium": {url: "ufoFlyMedium.png", width: 32, height: 35, x: 16, y: 35},
		"landmedium": {url: "ufoLandMedium.png", width: 32, height: 28, x: 16, y: 28},
		"flysmall": {url: "ufoFlySmall.png", width: 16, height: 17, x: 8, y: 8},
		"landsmall": {url: "ufoLandSmall.png", width: 16, height: 14, x: 8, y: 7},
		"flylarge": {url: "ufoFlyLarge.png", width: 64, height: 70, x: 32, y: 70},
		"landlarge": {url: "ufoLandLarge.png", width: 64, height: 56, x: 32, y: 56}
	},
	ufo: {
		color: "#000000",
		visible: true,
		trackVisible: false,
		trackStrokeOpacity: 1,
		trackStrokeWeight: 1,
		flat: true
	},
	ufosTable: {
		mode: "short",
		allVisibleCheckboxColor: "blue"
	},
	playerState: "pause",
	playerSpeed: 1,
	renderTableDataInterval: 1000,
	windows: {
		ufosTable: {
			visible: true,
			title: "Leaderboard",
			resizable: false,
			resizableY: true,
			height: 300,
			width: 370,
			top: 380,
			left: 90
		},
		playerControl: {
			visible: true,
			showHeader: false,
			resizable: false,
			absoluteCloseIcon: true,
			title: "Player",
			width: 940,
			top: 160,
			left: 90,
			xPosition: "center",
			yPosition: "bottom",
			bottom: 20
		},
		mainMenu: {
			visible: true,
			title: "Title",
			showHeader: false,
			resizable: false,
			absoluteCloseIcon: true,
			width: 940,
			height: 110,
			top: 60,
			xPosition: "center"
		}
	},
	tracksVisualMode: "full",
	cylindersVisualMode: "full",
	modelsVisualMode: "medium",
	shortWayVisualMode: "wide",
	namesVisualMode: "auto",
	shortWay: {
		wide: {
			color: "#336699",
			strokeOpacity: 0.5,
			strokeWeight: 5
		},
		thin: {
			color: "#336699",
			strokeOpacity: 1,
			strokeWeight: 2
		}
	},
	namesVisualModeAutoMinZoom: 12,
	namesVisualAutoMinZoom: 12,
	waypoint: {
		color: "#000000",
		strokeOpacity: 0.8,
		strokeWeight: 1,
		fillOpacity: 0.2,
	},
	waypointsColors: {
		to: {
			closed: "#ff0000",
			opened: "#00ff00"
		},
		waypoint: {
			closed: "#909090",
			opened: "#909090"
		},
		goal: {
			closed: "#0000ff",
			opened: "#0000ff"
		}
	},
	map: {
		zoom: 9,
		center: {lat: 55.748758, lng: 37.6174},
		type: "TERRAIN"
	},
	// Настройки тестового сервера
	testServerOptions: {
		mainTitle: "52th FAI european paragliding championship",
		taskTitle: "Task1 - 130km",
		dateTitle: "22 Sep, 2012",
		placeTitle: "France, Saint Andre les Alpes",
		pilotsCnt: 15,
		waypointsCnt: 5,
		startKey: (new Date).getTime() - 120000,
		endKey: (new Date).getTime() - 60000,
		dtStep: 1000,
		// Данные для генератора координат
		coords: {
			center: {
				lat: 55.75,
				lng: 37.61,
				elevation: 500
			},
			// Разброс стартового положения пилотов
			dispersion: 0.02,
			elevationDispersion: 100,
			// Максимальная дистанция, на которую пилот может улететь за 1 шаг
			maxStep: 0.005,
			elevationMaxStep: 100,
			// Вероятность того, что пилот не будет двигаться на текущем шаге
			holdProbability: 0,
			// угол в градусах, на который максимум может повернуться параплан
			directionMaxStep: 30
		},
		waypoints: {
			dispersion: 0.1,
			maxRadius: 1600,
			minRadius: 600,
			height: 500,
		},
		// Задержка, с которой тестовый сервер отдает ответ
		testDelay: 1000,
	}
});