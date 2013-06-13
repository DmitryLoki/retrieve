define(["jquery","knockout","widget!Checkbox","config","CountryCodes","jquery.tinyscrollbar"], function($,ko,Checkbox,config,countryCodes) {
	var UfosTable = function(options) {
		var self = this;

		this.ufos = options.ufos;
		this.raceKey = options.raceKey;
		this.inModalWindow = ko.observable(false);
		this.mode = ko.observable(config.ufosTable.mode);

		this.tableUfos = ko.observableArray([]);
		this.ufos.subscribe(function(ufos) {
			if (self.tableUfos().length == 0) {
				var ufos2add = [];
				for (var i = 0; i < ufos.length; i++)
					ufos2add.push(self.createUfo(ufos[i]));
				self.tableUfos(ufos2add);
			}
			else {
				var rev1 = {}, rev2 = {};
				for (var i = 0, l = ufos.length; i < l; i++)
					rev1[ufos[i].id()] = i;
				for (var i = 0, l = self.tableUfos().length; i < l; i++)
					rev2[self.tableUfos()[i].id()] = i;
				for (var i = 0, l = ufos.length; i < l; i++) {
					if (rev2[ufos[i].id()] == null) {
						self.tableUfos.push(self.createUfo(ufos[i]));
						rev2[ufos[i].id()] = self.tableUfos().length - 1;
					}
				}
				for (var i = 0, l = self.tableUfos().length; i < l; i++) {
					if (rev1[self.tableUfos()[i].id()] == null) {
						self.detroyUfo(self.tableUfos()[i]);
						self.tableUfos.splice(i,1);
						i--;
					}
				}
			}
			self.sortTableRows();
		});

		this.allVisible = ko.computed({
			read: function() {
				return !self.ufos().some(function(w) { 
					return !w.visible();
				});
			},
			write: function(val) {
				self.ufos().forEach(function(w) {
					w.visible(val);
				});
			}
		});
		this.allVisibleCheckbox = new Checkbox({checked:this.allVisible,color:config.ufosTable.allVisibleCheckboxColor});
	}

	UfosTable.prototype.sortTableRows = function() {
		this.tableUfos.sort(function(a,b) {
			d1 = (a && a.tableData && a.tableData.dist && a.tableData.dist() > 0) ? a.tableData.dist() : null;
			d2 = (b && b.tableData && b.tableData.dist && b.tableData.dist() > 0) ? b.tableData.dist() : null;
			s1 = (a && a.tableData && a.tableData.state) ? a.tableData.state() : null;
			s2 = (b && b.tableData && b.tableData.state) ? b.tableData.state() : null;
			c1 = (a && a.tableData && a.tableData.stateChangedAt) ? a.tableData.stateChangedAt() : null;
			c2 = (b && b.tableData && b.tableData.stateChangedAt) ? b.tableData.stateChangedAt() : null;

			if (s1 == "finished" && s2 == "finished") {
				if (c1 && c2) return c1 == c2 ? 0 : (c1 < c2 ? -1 : 1);
				if (c1) return 1;
				if (c2) return -1;
				return 0;
			}
			else if (s1 == "finished") return -1;
			else if (s2 == "finished") return 1;

			if (s1 == null && s2 != null) return 1;
			if (s1 != null && s2 == null) return -1;

			if (s1 == "landed" && s2 != "landed") return 1;
			if (s2 == "landed" && s1 != "landed") return -1;

			if (d1 > 0 && d2 > 0) {
				d1 = Math.floor(d1*10);
				d2 = Math.floor(d2*10);
				return d1 == d2 ? 0 : (d1 < d2 ? -1 : 1);
			}
			if (d2 > 0) return 1;
			if (d1 > 0) return -1;
			return 0;
		});
	}

	UfosTable.prototype.getTimeStr = function(h,m,s) {
		return (h<10?"0":"") + h + ":" + (m<10?"0":"") + m + ":" + (s<10?"0":"") + s;
	}


	UfosTable.prototype.createUfo = function(data) {
		var self = this;
		var w = {
			id: data.id,
			name: data.name,
			country: data.country,
			color: data.color,
			state: data.state,
			stateChangedAt: data.stateChangedAt,
			visible: data.visible,
			trackVisible: data.trackVisible,
			noData: data.noData,
			tableData: data.tableData
		}
		w.visibleCheckbox = new Checkbox({checked:w.visible,color:w.color});
		w.trackVisibleCheckbox = new Checkbox({checked:w.trackVisible,color:w.color});
		w.finishedTime = ko.computed(function() {
			if (!w.tableData || !w.tableData.state || w.tableData.state()!="finished" || !w.tableData.stateChangedAt || !w.tableData.stateChangedAt()) return null;
//			var d = new Date(w.tableData.stateChangedAt()*1000 - self.raceKey());
//			var d = new Date(w.tableData.stateChangedAt()*1000);
//			var h = d.getHours(), m = d.getMinutes(), s = d.getSeconds();
//			return (h<10?"0":"") + h + ":" + (m<10?"0":"") + m + ":" + (s<10?"0":"") + s;

			var d = Math.abs(w.tableData.stateChangedAt() - Math.floor(self.raceKey()/1000));
			return self.getTimeStr(Math.floor(d/3600),Math.floor(d%3600/60),d%60);
		});
		w.speed = ko.computed(function() {
			return Math.floor(w.tableData.gSpd()*36)/10;
		});
		w.country3 = ko.computed(function() {
			return w.country() && countryCodes[w.country()] ? countryCodes[w.country()] : w.country();
		});
		return w;
	}

	UfosTable.prototype.destroyUfo = function(ufo) {
	}

	UfosTable.prototype.alignColumns = function(it) {
		var self = this;
		if (!this.headerContainer || !this.bodyContainer) return;
		this.headerContainer.find("table").width(this.bodyContainer.find("table").width());
		var columns = this.headerContainer.find("tr:first").find("td");
		this.bodyContainer.find("tr:first").find("td").each(function(i) {
			var td = $(this);
			$(columns.get(i)).width(td.width());
		});
		if (!it) {
			setTimeout(function() {
				self.alignColumns(1);
			},100);
		}
		if (this.scrollbarContainer)
			this.scrollbarContainer.tinyscrollbar_update();
	}

	UfosTable.prototype.domInit = function(element, params) {
		var self = this;

		this.modalWindow = params.modalWindow;
		if (this.modalWindow) {
			this.switchMode = function() {
				if (self.mode() == "short") {
					self.modalWindow.width(570);
					// В css при изменении ширины идет transition: width 0.1s, поэтому здесь - костыльный таймаут
					setTimeout(function() {
						self.mode("full");
					},500);
				}
				else {
					self.mode("short");
					self.modalWindow.width(370);
				}
			}
			this.inModalWindow(true);
			this.modalWindow.on("resize",function() {
				self.alignColumns();
			})
		}

		var div = ko.virtualElements.firstChild(element);
		while (div && div.nodeType != 1)
			div = ko.virtualElements.nextSibling(div);
		this.container = $(div);

		this.headerContainer = this.container.find(".airvis-table-header");
		this.bodyContainer = this.container.find(".airvis-table-body");

		this.alignColumns();

		this.ufos.subscribe(function() {
			self.alignColumns();
		});
		this.mode.subscribe(function() {
			self.alignColumns();
		});

		this.scrollbarContainer = this.container.find(".airvis-scrollbar").tinyscrollbar();
	};

	UfosTable.prototype.templates = ["main"];

	return UfosTable;
});
