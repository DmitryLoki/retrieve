define(['widget!TrackerPageSimple'], function(TrackerPageSimple) {
	var App = function(){
		this.page = new TrackerPageSimple;
		window.airvisPage = this.page;
	};

	return App;
});
