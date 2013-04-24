define(["jquery","knockout","widget!Checkbox","jquery.jscrollpane","jquery.mousewheel"],function($,ko,Checkbox){
	var UfosTable = function(ufos) {
		this.ufos = ufos;
		var self = this;

		console.log("scrollpane",$.fn.jScrollPane,$.fn.mousewheel,$.fn.unmousewheel);

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

	UfosTable.prototype.domInit = function(element, params) {
		var self = this;

		this.modalWindow = params.modalWindow;
		if (this.modalWindow) {
			this.switchMode = function() {
				self.mode(self.mode()=="short"?"full":"short");
				self.modalWindow.width(self.mode()=="short"?370:490);
			}
			this.inModalWindow(true);
		}

		var div = ko.virtualElements.firstChild(element);
		while (div && div.nodeType != 1)
			div = ko.virtualElements.nextSibling(div);
		this.container = $(div);
		this.container.find("div.airvis-table-with-fixed-header-inner").jScrollPane({
			'scrollbarWidth':0, 
			'showArrows':false,
			'contentWidth': '0px'
		});
	};

	UfosTable.prototype.domDestroy = function(elem, params) {
	};
	
	UfosTable.prototype.templates = ['main'];

	return UfosTable;
});
