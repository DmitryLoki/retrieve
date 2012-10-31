define({
    load: function(name, req, load, config){
    	if(config.isBuild){
    		var libs = ['walk', 'domReady!', 'widgets/' + name + '/main', 'EventEmitter', 'utils'];
        	var fs = require.nodeRequire('fs');
        	var path = require.nodeRequire('path');
        	fs.readdirSync(path.dirname(req.toUrl('widgets/' + name + '/main'))).forEach(function(file){
        		if(path.extname(file) == '.html')
        			libs.push('text!widgets/' + name + '/' + file);
        	});
    		req(libs, function(){load();});
    		return;
    	}

        req(['widgets/' + name + '/main', 'EventEmitter', 'utils'], function(widget, EventEmitter, utils){
        	widget.prototype._widgetName = name;
			if(widget.prototype.templates){
				req(['walk', 'domReady!'], function(walk, doc){
					var tmpls = widget.prototype.templates;
					var tmplHtml = {};
					var w = walk(tmplHtml);
					for(var i = 0; i < tmpls.length; i++){
    					(function(i){
    						var node = doc.getElementById('template_' + name + '_' + tmpls[i]);
    						if(node){
    							tmplHtml[tmpls[i]] = node.innerHTML;
    							node.parentNode.removeChild(node); // memory optimization
    						}
    						else
    							w.step(function(step){
    								req(['text!widgets/' + name + '/' + tmpls[i] + '.html'], function(html){
    									step.val[tmpls[i]] = html;
    									step.next();
    								});
    							});
    					})(i);
					}
					w.wait(function(){
						widget.prototype.templates = tmplHtml;
						utils.extend(widget.prototype, EventEmitter.prototype);
						load(widget);
					});
				});
			}
			else
				load(widget);
        });
    }
});
