define(["knockout","utils"], function (ko,utils) {
    var RadioGroup = function(params) {
        var self = this;
        this.data = this.asObservable(params.data,0);
        this.color = this.asObservable(params.color,"Gray");
        this.values = ko.observableArray(params.values || []);

        this.displayValues = ko.computed(function() {
            if (!self.values || self.values().length == 0) return [];
            var out = [];
            self.values().forEach(function(rw) {
                out.push({
                    title: rw.title,
                    color: rw.color || self.color,
                    value: rw.value,
                    checked: ko.computed(function() {
                        return self.data() == rw.value;
                    }),
                    click: function(obj,e) {
                        if (self.data() != rw.value) {
                            self.data(rw.value);
                            self.emit("changed",self.data());
                        }
                    }
                });
            });
            return out;
        });
    }

    RadioGroup.prototype.asObservable = function(v,defaultV) {
        if (ko.isObservable(v) || ko.isComputed(v)) return v;
        return ko.observable(typeof v == "function" ? v() : (typeof v == "undefined" ? defaultV : v));
    }

    RadioGroup.prototype.templates = ["main"];
    return RadioGroup;
});