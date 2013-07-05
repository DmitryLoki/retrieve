define(['widget!TrackerPageDebug'], function(TrackerPageDebug){
	var App = function(){
		this.page = new TrackerPageDebug;
		window.airvisPage = this.page;
	};

	return App;
});
