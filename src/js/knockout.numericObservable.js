define(["knockout"],function(ko) {
    ko.numericObservable = function(initialValue) {
        var _actual = ko.observable(initialValue);
        var result = ko.computed({
            read: function() {
                return _actual();
            },
            write: function(newValue) {
                var parsedValue = parseFloat(newValue);
                _actual(isNaN(parsedValue) ? newValue : parsedValue);
            }
        });
        return result;
    };
});