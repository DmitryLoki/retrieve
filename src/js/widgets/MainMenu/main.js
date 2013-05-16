define(["utils","knockout"],function(utils,ko) {
	var MainMenu = function() {
		this.titles = ko.observable({});
	}

	MainMenu.prototype.setTitles = function(titles) {
		this.titles(titles);
		this.titles.valueHasMutated();
	}

	MainMenu.prototype.templates = ["main"];

	return MainMenu;
});