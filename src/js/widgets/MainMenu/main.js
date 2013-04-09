define(["utils","knockout"],function(utils,ko) {
	var MainMenu = function() {
		var self = this;

		this.items = ko.observableArray();

		this.switchVisibility = function(item,e) {
			item.visible(!item.visible());
		}
	}

	MainMenu.prototype.templates = ["main"];

	return MainMenu;
});