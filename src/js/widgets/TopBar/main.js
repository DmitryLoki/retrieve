define(["utils","knockout"],function(utils,ko) {
	var TopBar = function() {
		var self = this;

		this.items = ko.observableArray();

		this.switchVisibility = function(item,e) {
			$(e.target).blur();
			item.slideSwitch(e);
		}

		this.registerSwitch = function(nodes,item) {
			for (var i = 0; i < nodes.length && nodes[i].nodeType != 1; i++);
			if (i >= nodes.length) return;
			item.registerSwitch(nodes[i]);
		}

		this.unregisterSwitch = function(node,i,item) {
			item.unregisterSwitch();
		}
	}

	TopBar.prototype.templates = ["main"];

	return TopBar;
});