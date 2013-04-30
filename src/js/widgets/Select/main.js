define(["jquery","knockout","utils"],function($,ko,utils) {
    var Select = function(params) {
        var self = this;
        this.data = this.asObservable(params.data,0);
        this.label = this.asObservable(params.label,"");
        this.expandDirection = this.asObservable(params.expandDirection,"down");
        this.expanded = ko.observable(false);
        this.faded = ko.observable(false);
        this.values = ko.observableArray(params.values || []);

        this.displayValues = ko.computed(function() {
            var out = [];
            if (!self.values || self.values().length == 0) return [];
            self.values().forEach(function(rw) {
                if (self.expandDirection() == "down") {
                    if (self.data() == rw.value) out.unshift(rw);
                    else out.push(rw);
                }
                else {
                    if (self.data() == rw.value) out.push(rw);
                    else out.unshift(rw);
                }
            });
            return out;
        })

        this.selectBoxPosition = ko.computed(function() {
            return "airvis-selectBox" + self.expandDirection();
        });

        this.displayValue = ko.computed(function() {
            var out = "";
            self.values().forEach(function(rw) {
                if (self.data() == rw.value)
                    out = rw.title;
            });
            return out;
        });

        this.expanded.subscribe(function(v) {
            self.emit(v?"expand":"collapse",self);
            if (self.expandContainer) {
                if (v) self.expandContainer.slideDown();
                else self.expandContainer.slideUp();
            }
        });

        this.faded.subscribe(function(v) {
            if (self.container) {
                self.container.find(".airvis-label").stop(true).animate({color:v?"#6d878f":"#ffffff"},200);
                self.container.find(".airvis-value").stop(true).animate({backgroundColor:v?"#537585":"rgba(255,255,255,0.75)"},200);
            }
        });
    }

    Select.prototype.fade = function() {
        this.faded(true);
    }

    Select.prototype.unfade = function() {
        this.faded(false);
    }

    Select.prototype.click = function(self,e) {
        if (self.expanded()) return;
        self.expanded(true);
        self._justExpanded = true;

        var collapse = function() {
            if (!self._justExpanded) {
                self.expanded(false);
                $(document).off("click",collapse);
            }
            self._justExpanded = false;
        }

        $(document).on("click",collapse);
    }

    Select.prototype.setValue = function(elem) {
        if (this.data() != elem.value) {
            this.data(elem.value);
            this.emit("changed",this.data());
        }
    }

    Select.prototype.asObservable = function(v,defaultV) {
        if (ko.isObservable(v) || ko.isComputed(v)) return v;
        return ko.observable(typeof v == "function" ? v() : (typeof v == "undefined" ? defaultV : v));
    }

    Select.prototype.domInit = function(element,params) {
        var div = ko.virtualElements.firstChild(element);
        while (div && div.nodeType != 1)
            div = ko.virtualElements.nextSibling(div);
        this.container = $(div);
        this.expandContainer = this.container.find(".airvis-selectBox");
    }

    Select.prototype.templates = ["main"];
    return Select;
});