define(['knockout', 'jquery'], function (ko, $) {

    var Checkbox = function (color) {
        this.checked = ko.observable(true);
        this.color = ko.observable(color || 'Gray');
    };

    Checkbox.prototype.clickHandler = function () {
        this.checked(!this.checked());
        this.emit('changed');
    };

    Checkbox.prototype.templates = ['main'];
    return Checkbox;
});