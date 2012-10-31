define(['knockout'], function(ko){
	var Button = function(){
    	this.title = ko.observable('...');
	};
	
	Button.prototype.domInit = function(elem, params){
		if(params.title)
			this.title(params.title);
	};

	Button.prototype.click = function(){
		this.emit('click');
	};

	Button.prototype.templates = ['main'];

	return Button;
});
