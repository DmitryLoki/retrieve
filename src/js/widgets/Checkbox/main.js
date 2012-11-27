define(['knockout'], function (ko) {

    /**
     * Виджет чекбокса.
     * @param {Object} params параметры чекбокса
     * @param {Observable Boolean} params.checked состояние чекбокса
     * @param {Observable String} [params.color='Gray'] цвет фона у установленного чекбокса в виде css-значения
     * @constructor
     */
    var Checkbox = function (params) {
        if(params.checked === undefined || !(params.checked instanceof ko.observable)) {
            throw new TypeError('params.checked is a required property and must be observable');
        }
        this.checked = params.checked;
        this.color = params.color || ko.observable('Gray');
    };

    Checkbox.prototype.clickHandler = function () {
        this.checked(!this.checked());
        this.emit('changed', this.checked());
    };

    Checkbox.prototype.templates = ['main'];
    return Checkbox;
});