define(['knockout', 'knockout.mapping'], function(ko, komap){
	var DataSource = function(params){
		this.params = params;
		this.url = '/' + params.lang + '/api/v1/' + params.name + '/?format=json' + (params.filter ? '&' + params.filter : '');
		this.offset = 0;
		this.total = 0;
		this.firstId = 0;
		this.lastId = 0;
	};

	DataSource.prototype.getUrl = function(){
		return this.url;
	}

	DataSource.prototype.nextPage = function(next){
		var self = this;
		$.get(this.url, {}, function(data){
			komap.fromJS(data.objects, {
				key: function(item){
			        return ko.utils.unwrapObservable(item.id);
			    },
				create: function(map){
					var event = new self.params.constr;
					komap.fromJS(map.data, {}, event);
					return event;
				},
			}, self.params.data);
			if(next)
				next();
		});
	};

	return DataSource;
});
