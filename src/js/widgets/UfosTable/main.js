define(['knockout'], function(ko){
	var UfosTable = function(ufos){
		this.ufos = ufos;
		var self = this;
	    this.allVisibleChecked = ko.computed({
	        read: function(){
	            return !self.ufos().some(function(item){
	                return !item.visibleChecked();
	            });
	        },
	        write: function(val){
	        	self.ufos().forEach(function(item){
	        		item.visibleChecked(val);
	        	});
	        }
	    });
	};

	UfosTable.prototype.domInit = function(elem, params){
	};

	UfosTable.prototype.domDestroy = function(elem, params){
	};
	
	UfosTable.prototype.templates = ['main'];

	return UfosTable;
});
