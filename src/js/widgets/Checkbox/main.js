define(['knockout'], function (ko) {

    /**
     * Виджет чекбокса.
     * @param {Object} params параметры чекбокса
     * @param {Observable Boolean} params.checked состояние чекбокса
     * @param {Observable String} [params.color='Gray'] цвет фона у установленного чекбокса в виде css-значения
     * @constructor
     */
    var Checkbox = function (params) {
        window.ko = ko;
        this.checked = params.checked;
        this.color = params.color || ko.observable('Gray');
    };

    Checkbox.prototype.clickHandler = function () {
        this.checked(!this.checked());
        this.emit('changed');
    };

    Checkbox.prototype.templates = ['main'];
    return Checkbox;
});