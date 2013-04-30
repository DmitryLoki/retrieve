define(["jquery","knockout"],function($,ko) {
	var WindowManager = function() {
		var self = this;

		this.items = ko.observableArray();
		this.precision = ko.observable(500);

		this.xSpace = 1;
		this.ySpace = 1;

		var getSegments = function(w) {
			var out = [];
			$.each(self.items(),function(i,v) {
				if (v != w && v.visible()) {
					out.push([v.left()-self.xSpace,v.top()-self.ySpace,v.left()+v.width()+self.xSpace,v.top()-self.ySpace]);
					out.push([v.left()-self.xSpace,v.left()-self.ySpace,v.left()-self.xSpace,v.top()+v.height()+self.ySpace]);
					out.push([v.left()+v.width()+self.xSpace,v.top()-self.ySpace,v.left()+v.width()+self.xSpace,v.top()+v.height()+self.ySpace]);
					out.push([v.left()-self.xSpace,v.top()+v.height()+self.ySpace,v.left()+v.width()+self.xSpace,v.top()+v.height()+self.ySpace]);
				}
			});
			return out;
		}

		var getPoints = function(w) {
			var out = [];
			$.each(self.items(),function(i,v) {
				if (v != w && v.visible()) {
					out.push([v.left()-self.xSpace,v.top()-self.ySpace],[v.left()+v.width()+self.xSpace,v.top()-self.ySpace],[v.left()-self.xSpace,v.top()+v.height()+self.ySpace],[v.left()+v.width()+self.xSpace,v.top()+v.height()+self.ySpace]);
				}
			});
			return out;
		}

		var segDist = function(a,b) {
			if (a[0] == a[2] && b[0] == b[2]) {
				if (b[3] < a[1]) return [b[2]-a[0],b[3]-a[1]];
				if (b[1] > a[3]) return [b[0]-a[2],b[1]-a[3]];
				return [b[0]-a[0],0];
	 		}
	 		if (a[1] == a[3] && b[1] == b[3]) {
				if (b[2] < a[0]) return [b[2]-a[0],b[3]-a[1]];
				if (b[0] > a[2]) return [b[0]-a[2],b[1]-a[3]];
				return [0,b[1]-a[1]];
	 		}
	 		return null;
		}

		var dragStart = function(w,e) {
			var startE = e;
			var startPosition = {top:w.top(),left:w.left()};
//			e.target.setCapture();
			var segments = getSegments(w);
			var points = getPoints(w);
			var mouseMove = function(e) {
				var top = startPosition.top + e.pageY - startE.pageY;
				var left = startPosition.left + e.pageX - startE.pageX;
				var width = w.width();
				var height = w.height();
				var pois = [
					[left-self.xSpace,top-self.ySpace],
					[left+width+self.xSpace,top-self.ySpace],
					[left-self.xSpace,top+height+self.ySpace],
					[left+width+self.xSpace,top+height+self.ySpace]
				];
				var segs = [
					[left-self.xSpace, top-self.ySpace, left+width+self.xSpace, top-self.ySpace],
					[left-self.xSpace, top-self.ySpace, left-self.xSpace, top+height+self.ySpace],
					[left+width+self.xSpace, top-self.ySpace, left+width+self.xSpace, top+height+self.ySpace],
					[left-self.xSpace, top+height+self.ySpace, left+width+self.xSpace, top+height+self.ySpace]
				];
				var v = [0,0];
				var min = null;
				$.each(points,function(i,b) {
					$.each(pois,function(i,a) {
						if (min == null || min > Math.pow(b[0]-a[0],2)+Math.pow(b[1]-a[1],2)) {
							v[0] = b[0]-a[0];
							v[1] = b[1]-a[1];
							min = Math.pow(v[0],2) + Math.pow(v[1],2);
						}
					});
				});
				if (min < self.precision()) {
					top += v[1];
					left += v[0];
				}
				else {
					$.each(segments,function(i,b) {
						$.each(segs,function(i,a) {
							var r = segDist(a,b);
							if (r && (min == null || min > Math.pow(r[0],2)+Math.pow(r[1],2))) {
								v[0] = r[0];
								v[1] = r[1];
								min = Math.pow(r[0],2) + Math.pow(r[1],2);
							}
						});
					});
					if (min < self.precision()) {
						top += v[1];
						left += v[0];
					}
				}
				w.top(top);
				w.left(left);
				w.emit("drag");
			}
			$("body").addClass("airvis-document-overwrite-cursor-move");
			$(document).on("mousemove",mouseMove).one("mouseup mouseleave",function(e) {
				$("body").removeClass("airvis-document-overwrite-cursor-move");
				$(document).off("mousemove",mouseMove);
			});
		}

		var resizeStart = function(dir,w,e) {
			var startE = e;
			if (w.height() == "auto") w.height();
			var startPosition = {height:w.height(),width:w.width()};
//			e.target.setCapture();

			var cursor = $(e.target).css("cursor");

			var segments = getSegments(w);
			var points = getPoints(w);
			var mouseMove = function(e) {
				var top = w.top();
				var left = w.left();
				var width = Math.max(startPosition.width + e.pageX - startE.pageX,w.minWidth() || 0);
				var height = Math.max(startPosition.height + e.pageY - startE.pageY,w.minHeight() || 0);
				var pois = [
					[left+width+self.xSpace,top+height+self.ySpace]
				];
				var segs = [
					[left+width+self.xSpace,top-self.ySpace,left+width+self.xSpace,top+height+self.ySpace],
					[left-self.xSpace,top+height+self.ySpace,left+width+self.xSpace,top+height+self.ySpace]
				]

				var v = [0,0];
				var min = null;
				$.each(points,function(i,b) {
					$.each(pois,function(i,a) {
						if (min == null || min > Math.pow(b[0]-a[0],2)+Math.pow(b[1]-a[1],2)) {
							v[0] = b[0]-a[0];
							v[1] = b[1]-a[1];
							min = Math.pow(v[0],2) + Math.pow(v[1],2);
						}
					});
				});
				if (min < self.precision()) {
					width += v[0];
					height += v[1];
				}
				else {
					$.each(segments,function(i,b) {
						$.each(segs,function(i,a) {
							var r = segDist(a,b,self.precision());
							if (r && (min == null || min > Math.pow(r[0],2)+Math.pow(r[1],2))) {
								v[0] = r[0];
								v[1] = r[1];
								min = Math.pow(r[0],2) + Math.pow(r[1],2);
							}
						});
					});
					if (min < self.precision()) {
						width += v[0];
						height += v[1];
					}
				}
				if (dir == "bottom" || dir == "bottom-right")
					w.height(height);
				if (dir == "right" || dir == "bottom-right")
					w.width(width);
				w.emit("resize");
			}
			$("body").addClass("airvis-document-overwrite-cursor-" + cursor);
			$(document).on("mousemove",mouseMove).one("mouseup mouseleave",function(e) {
				$("body").removeClass("airvis-document-overwrite-cursor-" + cursor);
				$(document).off("mousemove",mouseMove);
			});
		}

		this.items.subscribe(function(rws) {
			rws.forEach(function(rw) {
				rw.off("dragStart",dragStart).on("dragStart",dragStart);
				rw.off("resizeStart",resizeStart).on("resizeStart",resizeStart);
			});
		});
	}

	return WindowManager;
});