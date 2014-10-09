WAF.define('DropDown', ['waf-core/widget'], function(widget) {
    "use strict";

    var DropDown = widget.create('DropDown', {
        tagName: 'select',
        selectItem: widget.property({ type: 'boolean', bindable: false }),
        value: widget.property(),
        items: widget.property({
            type: 'datasource',
            attributes: [{
                name: 'value'
            }, {
                name: 'label'
            }],
            pageSize: 40
        }),
        limit: widget.property({ type: 'integer', defaultValue: 40, bindable: false }),
        allowEmpty: widget.property({ type: 'boolean', bindable: false }),
        render: function(elements) {
            if(!this.items()) {
                this.node.innerHTML = '';
                return;
            }
            var s = '';
            var position = this.items().getPosition();
            if(this.allowEmpty()) {
                s += '<option></option>';
            }
            s += elements.map(function(i, index) {
                return '<option value="' + i.value + '"' + (position === index ? ' selected' : '') + '>' + i.label + '</option>';
            }).join('');
            this.node.innerHTML = s;
            this._valueChangeHandler();
        },
        _valueChangeHandler: function() {
            var value = this.value();
            var opt = $('[value=' + (value || '') + ']', this.node).get(0);
            if(opt) {
                opt.selected = true;
            } else {
                this.fire('errorNotFound');
            }
        },
        _getRelatedDataClass: function() {
            var bound = this.value.boundDatasource();
            if(!bound || !bound.valid) {
                return null;
            }
            var attribute = bound.datasource.getAttribute(bound.attribute);
            if(attribute.kind === 'relatedEntity' && WAF.ds.getDataClass(attribute.type)) {
                return attribute.type;
            }
            return null;
        },
        _initBinding: function() {
            var dataClass = this._getRelatedDataClass();

            // force value attribute to the key
            if(this.selectItem() || dataClass) {
                if(this.items()) {
                    dataClass = this.items().getDataClass();
                }
                var map = this.items.mapping();
                if(dataClass instanceof WAF.DataClass) {
                    map.value = dataClass._private.primaryKey;
                } else {
                    for(var k in dataClass) {
                        if(dataClass[k].isKey) {
                            map.value = k;
                        }
                    }
                }
                this.items.mapping(map);
            }

            if(!dataClass) {
                return;
            }

            if(this.items() && this.items().getDataClass() === dataClass) {
                return;
            }
            // create a datasource
            var datasource = WAF.dataSource.create({ binding: dataClass });
            this.items(datasource);
            datasource.all();
            // FIXME: destroy the created datasource
        },
        init: function() {
            this._subscriber = this.value.onChange(this._valueChangeHandler);
            this._initBinding();
            this.subscribe('datasourceBindingChange', 'value', this._initBinding, this);

            this.items.onPageChange(this.render);

            this.items.fetch({ pageSize: this.limit() });
            this.limit.onChange(function() {
                this.items.fetch({ pageSize: this.limit() });
            });

            $(this.node).on('change', function() {
                var position = this.getSelectedIndex();
                this._setValueByPosition(position);
            }.bind(this));

            if(this.selectItem()) {
                this._selectSubscriber = this.items.subscribe('currentElementChange', function() {
                    var position = this.items().getPosition();
                    this.node.selectedIndex = position + (this.allowEmpty() ? 1 : 0);
                    this._setValueByPosition(position);
                }, this);
            }
        },
        _setValueByPosition: function(position) {
            this._subscriber.pause();
            // FIXME: to simplify when setAttributeValue accept KEY for relatedEntity
            if(this._getRelatedDataClass()) {
                var bound = this.value.boundDatasource();
                if(position < 0) {
                    this.value(null);
                    bound.datasource[bound.attribute].set(null);
                } else {
                    this.items().getEntityCollection().getEntity(position, function(event) {
                        bound.datasource[bound.attribute].set(event.entity);
                    }.bind(this));
                }
            } else {
                if(position < 0) {
                    this.value(null);
                } else {
                    this.items().getElement(position, function(event) {
                        var element = this.items.mapElement(event.element);
                        this.value(element.value);
                    }.bind(this));
                }
            }
            this._subscriber.resume();

            if(this.selectItem()) {
                this._selectSubscriber.pause();
                this.items().select(position);
                this._selectSubscriber.resume();
            }
        },
        getSelectedIndex: function() {
            var position = this.node.selectedIndex;
            if(this.allowEmpty()) {
                return position - 1;
            }
            return position;
        }
    });

    return DropDown;

});
