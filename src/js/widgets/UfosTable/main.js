define(["jquery","knockout","widget!Checkbox","jquery.tinyscrollbar"],function($,ko,Checkbox){
//	,"jquery.jscrollpane","jquery.mousewheel"
	var UfosTable = function(ufos) {
		this.ufos = ufos;
		var self = this;

		this.inModalWindow = ko.observable(false);
		this.mode = ko.observable("short");

	    this.allVisibleChecked = ko.computed({
	        read: function(){
	            return !self.ufos().some(function(item){
	                return !item.visibleCheckbox.checked();
	            });
	        },
	        write: function(val){
	        	self.ufos().forEach(function(item){
	        		item.visibleCheckbox.checked(val);
	        	});
	        }
	    });
        this.allVisibleCheckbox = new Checkbox({checked: this.allVisibleChecked, color: 'blue'});

	    this.allTitleVisibleChecked = ko.computed({
	        read: function(){
	            return !self.ufos().some(function(item){
	                return !item.titleVisibleCheckbox.checked();
	            });
	        },
	        write: function(val){
	        	self.ufos().forEach(function(item){
	        		item.titleVisibleCheckbox.checked(val);
	        	});
	        }
	    });
        this.allTitleVisibleCheckbox = new Checkbox({checked: this.allTitleVisibleChecked, color: 'blue'});

	    this.allTrackVisibleChecked = ko.computed({
	        read: function(){
	            return !self.ufos().some(function(item){
	                return !item.trackVisibleCheckbox.checked();
	            });
	        },
	        write: function(val){
	        	self.ufos().forEach(function(item){
	        		item.trackVisibleCheckbox.checked(val);
	        	});
	        }
	    });
        this.allTrackVisibleCheckbox = new Checkbox({checked: this.allTrackVisibleChecked, color: 'blue'});
	};

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
				self.mode(self.mode()=="short"?"full":"short");
				self.modalWindow.width(self.mode()=="short"?370:520);
			}
			this.inModalWindow(true);
		}
		this.modalWindow.on("resize",function() {
			self.alignColumns();
		})

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
/*
		this.bodyContainer.jScrollPane({
			scrollbarWidth: 0,
			showArrows: false,
			contentWidth: 0
		});
		this.container.find("div.airvis-table-with-fixed-header-inner").jScrollPane({
			'scrollbarWidth':0, 
			'showArrows':false,
			'contentWidth': '0px'
		});
*/
	};

	UfosTable.prototype.domDestroy = function(elem, params) {
	};
	
	UfosTable.prototype.templates = ['main'];

	return UfosTable;
});
