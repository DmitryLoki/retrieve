define(["jquery","knockout","config","CountryCodes","widget!Checkbox","jquery.tinyscrollbar"], function($,ko,config,countryCodes, Checkbox) {
	var RetrieveTable = function(options) {
		this.constr(options);
	}

  RetrieveTable.prototype.constr = function(options){
    var self = this;
    this.ufos = options.ufos;
    this.status = options.status;
    this.state = options.state;
    this.selectedUfo = options.selectedUfo;
    //this.smsData = options.smsData;
    this.inModalWindow = ko.observable(false);
    this.ufoStatuses = ko.observableArray(config.ufoStatuses);
    this.tableUfos = ko.observableArray([]);
    this.ufos.subscribe(function(ufos) {
      var rev1 = {}, rev2 = {}, values2push = [];
      for (var i = 0, l = ufos.length; i < l; i++)
        rev1[ufos[i].id()] = i;
      for (var i = 0, l = self.tableUfos().length; i < l; i++)
        rev2[self.tableUfos()[i].id()] = i;
      for (var i = 0, l = ufos.length; i < l; i++) {
        if (rev2[ufos[i].id()] == null) {
          values2push.push(self.createUfo(ufos[i]));
          rev2[ufos[i].id()] = self.tableUfos.length - 1;
        }
      }
      if (values2push.length > 0)
        ko.utils.arrayPushAll(self.tableUfos,values2push);
      for (var i = 0, l = self.tableUfos().length; i < l; i++) {
        if (rev1[self.tableUfos()[i].id()] == null) {
          self.destroyUfo(self.tableUfos()[i]);
          self.tableUfos.splice(i,1);
          i--;
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

    this.pilotNameFilter = ko.observable("");
  }

	RetrieveTable.prototype.sortTableRows = function() {
		this.tableUfos.sort(function(a,b) {
      var aUnreadCount = a.unreadCount(),
        bUnreadCount = b.unreadCount(),
        aNewSMS = a.newSmsCount(),
        bNewSMS = b.newSmsCount();
      if(aNewSMS || aUnreadCount) aNewSMS = a.smsData().slice(-1)[0].timestamp;
      if(bNewSMS || bUnreadCount) bNewSMS = b.smsData().slice(-1)[0].timestamp;

      if(aUnreadCount && bUnreadCount) return aNewSMS > bNewSMS? 1 : -1;
      if(!aUnreadCount && bUnreadCount) return 1;
      if(!bUnreadCount && aUnreadCount) return -1;

      var  aStatus = a.status(),
        bStatus = b.status(),
        aDataLength = a.smsData().length,
        bDataLength = b.smsData().length,
        aDist = parseFloat(a.dist()),
        bDist = parseFloat(b.dist());
      if(aNewSMS && bNewSMS) return aNewSMS > bNewSMS?1:-1;
      if(!aNewSMS && bNewSMS) return 1;
      if(!bNewSMS && aNewSMS) return -1;
      if(!bNewSMS && !aNewSMS) {
        if(aStatus == bStatus) {
          //if(aDataLength == 0 && bDataLength == 0) return 0;
          if(aDataLength != bDataLength) return aDataLength > bDataLength ? 1 : -1;
          else return aDist < bDist ? 1 : -1;
        }
          else return aStatus < bStatus ? 1: -1;
      }
		});
	}

	RetrieveTable.prototype.runTableSorter = function() {
		var self = this;
		if (this.tableSorterTimer)
			clearTimeout(this.tableSorterTimer);
		this.tableSorterTimer = setTimeout(function() {
			self.sortTableRows();
		},1000);
	}

	RetrieveTable.prototype.createUfo = function(data) {
		var self = this;
		var w = {
			id: data.id,
			name: data.name,
			personId: data.personId,
			dist: data.dist,
			country: data.country,
      status: data.status,
			gSpd: data.gSpd,
      lastUpdate: data.lastUpdate,
      trackerName: data.trackerName,
      trackerCharge: data.trackerCharge,
			tableData: data.tableData,
      visible: data.visible,
      smsData: data.smsData,
      newSmsCount: data.newSmsCount,
      unreadCount: data.unreadSmsCount
    };
    //w.newSmsCount = ko.observable(0);
    w.smsData.subscribe(function(){
      self.runTableSorter();
    });
    w.country3 = ko.computed(function() {
      return w.country() && countryCodes[w.country()] ? countryCodes[w.country()] : w.country();
    });
    w.smsCount = ko.computed(function() {
      return w.newSmsCount()|| w.smsData().length;
    });
    w.visibleCheckbox = new Checkbox({checked:w.visible,color:"#909090"});
		return w;
	}

  RetrieveTable.prototype.lastUpdateFormat = function(lastTime) {
    if(!lastTime()) {
      return "-:-:-";
    }
    var dateFromLastSignal  = new Date(lastTime());
    return this.getTimeString(Math.floor(dateFromLastSignal / 3600), Math.floor(dateFromLastSignal % 3600 / 60), dateFromLastSignal % 60);
  }

  RetrieveTable.prototype.getTimeString = function(h,m,s){
    h = Math.abs(h);
    m = Math.abs(m);
    s = Math.abs(s);
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

	RetrieveTable.prototype.destroyUfo = function(ufo) {
	}

	RetrieveTable.prototype.selectUfo = function(ufo) {
		this.selectedUfo(ufo);
	}

	RetrieveTable.prototype.alignColumns = function(it) {
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

	RetrieveTable.prototype.switchState = function() {
		this.state(this.state() == "pause" ? "play" : "pause");
	}

	RetrieveTable.prototype.domInit = function(element, params) {
		var self = this;
		this.modalWindow = params.modalWindow;
		if (this.modalWindow) {
			this.inModalWindow(true);
			this.modalWindow.on("resize",function() {
				self.alignColumns();
			})
		}
		var div = ko.virtualElements.firstChild(element);
		while (div && div.nodeType != 1)
			div = ko.virtualElements.nextSibling(div);
		this.container = $(div);
		this.headerContainer = this.container.find(".airvis-table-header-1");
		this.bodyContainer = this.container.find(".airvis-table-body");
		this.alignColumns();
		this.ufos.subscribe(function() {
			self.alignColumns();
		});
		this.scrollbarContainer = this.container.find(".airvis-scrollbar").tinyscrollbar();
	};

  RetrieveTable.prototype.updateScrollbar = function(){
    if(this.scrollbarContainer)
      this.scrollbarContainer.tinyscrollbar_update();
  };

  RetrieveTable.prototype.filterPilots = function() {
    this.pilotNameFilter(this.headerContainer.find('.pilot-filter-input').val());
    setTimeout(this.updateScrollbar.bind(this),0);
  };

  RetrieveTable.prototype.onPilotClick = function(ufo,event){
    event.stopPropagation();
    this.emit("pilotClicked", ufo.id());
  };

  RetrieveTable.prototype.getPilotsByStatus = function(status){
    return this.ufos().filter(function(ufo){return ufo.status() == status;});
  };
  RetrieveTable.prototype.filterPilot = function(name){
    return name().toLowerCase().indexOf(this.pilotNameFilter().toLowerCase())>-1;
  };

	RetrieveTable.prototype.templates = ["main"];

	return RetrieveTable;
});
