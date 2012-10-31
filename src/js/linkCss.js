define({
	load: function (name, req, load, config){
		var url = req.toUrl(name);
		var link = document.createElement("link");
	    link.type = "text/css";
	    link.rel = "stylesheet";
	    link.href = url;
	    document.getElementsByTagName("head")[0].appendChild(link);
        load(true);
	}
});
