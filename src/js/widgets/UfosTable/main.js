define(['knockout','widget!Checkbox'], function(ko, Checkbox){
	var UfosTable = function(ufos){
		this.ufos = ufos;
		var self = this;

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

	UfosTable.prototype.domInit = function(elem, params){
	};

	UfosTable.prototype.domDestroy = function(elem, params){
	};
	
	UfosTable.prototype.templates = ['main'];

	return UfosTable;
});
