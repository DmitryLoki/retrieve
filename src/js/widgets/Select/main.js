define(["jquery","knockout","utils"],function($,ko,utils) {
    var Select = function(params) {
        var self = this;
        this.data = this.asObservable(params.data,0);
        this.label = this.asObservable(params.label,"");
        this.expandDirection = this.asObservable(params.expandDirection,"down");
        this.expanded = ko.observable(false);
        this.faded = ko.observable(false);
        this.values = ko.observableArray(params.values || []);

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

    Select.prototype.templates = ["main"];
    return Select;
});