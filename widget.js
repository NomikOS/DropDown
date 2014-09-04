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
            var s = '';
            if(this.allowEmpty()) {
                s += '<option></option>';
            }
            s += elements.map(function(i) {
                return '<option value="' + i.value + '">' + i.label + '</option>';
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
                var map = this.items.mapping();
                for(var k in dataClass) {
                    if(dataClass[k].identifying) {
                        map.value = k;
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
            var subscriber = this.value.onChange(this._valueChangeHandler);
            this._initBinding();
            this.subscribe('datasourceBindingChange', 'value', this._initBinding, this);

            this.items.onPageChange(this.render);

            this.items.fetch({ pageSize: this.limit() });
            this.limit.onChange(function() {
                this.items.fetch({ pageSize: this.limit() });
            });

            $(this.node).on('change', function() {
                var position = this.node.selectedIndex;
                if(this.allowEmpty()) {
                    if(!position) {
                        this.value(null);
                        return;
                    }
                    position--;
                }
                subscriber.pause();
                // FIXME: to simplify when setAttributeValue accept KEY for relatedEntity
                if(this._getRelatedDataClass()) {
                    this.items().getEntityCollection().getEntity(position, function(event) {
                        var bound = this.value.boundDatasource();
                        bound.datasource[bound.attribute].set(event.entity);
                    }.bind(this));
                } else {
                    var options = $('option', this.node);
                    this.value(options.get(this.node.selectedIndex).value);
                }
                subscriber.resume();

                if(this.selectItem()) {
                    selectSubscriber.pause();
                    this.items().selectByKey(this.value());
                    selectSubscriber.resume();
                    return;
                }

            }.bind(this));

            if(this.selectItem()) {
                var selectSubscriber = this.items.subscribe('currentElementChange', function() {
                    this.value(this.items().getKey());
                }, this);
            }
        }
    });

    return DropDown;

});
