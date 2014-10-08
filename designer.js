(function(DropDown) {
    "use strict";
    /* globals Designer */

    DropDown.setWidth('200');
    DropDown.setHeight('25');

    DropDown.addLabel();

    DropDown.doAfter('init', function() {
        this.subscribe('datasourceBindingChange', 'value', function(event) {
            var binding = event.data;
            hideAttributes(this, binding);
        }, this);

        this.selectItem.onChange(function() {
            if(this.selectItem()) {
                this.value.oldBinding = this.value.boundDatasource();
                if(this.value.oldBinding) {
                    this.value.oldBinding = this.value.oldBinding.toString();
                }
                this.value.bindDatasource('');
            } else {
                this.value.bindDatasource(this.value.oldBinding);
                delete this.value.oldBinding;
            }
            var binding = this.value.boundDatasource();
            hideAttributes(this, binding);
        });
    });

    DropDown._studioOn('propertyPanelReady', function() {
        var binding = this.getWidget().value.boundDatasource();
        hideAttributes(this.getWidget(), binding);
    });

    function hideAttributes(widget, binding) {
        widget.value.show();
        Designer.ui.form.property.showAttribute('data-items-attribute-value');
        Designer.ui.form.property.showAttribute('data-static-binding-items');

        if(widget.selectItem()) {
            widget.value.hide();
            Designer.ui.form.property.hideAttribute('data-items-attribute-value');
        } else if(binding && binding.datasourceName) {
            var attribute = getAttribute(binding.datasourceName, binding.attribute);
            if(attribute && attribute.kind === "relatedEntity") {
                Designer.ui.form.property.hideAttribute('data-items-attribute-value');
                Designer.ui.form.property.hideAttribute('data-static-binding-items');

                var itemsBinding = widget.items.boundDatasource();
                if(!itemsBinding || !itemsBinding.datasourceName) {
                    widget.items(attribute.path);
                }
            }
        }
    }

    function getAttribute(datasourceName, attributeName) {
        var ds = Designer.env.ds.catalog.getByName(datasourceName);
        if(!ds) {
            return null;
        }
        attributeName = attributeName.split('.');
        var first = attributeName.shift();
        var att = ds.getAttribute(first);

        if(!attributeName.length) {
            return att;
        }

        if(att.kind !== 'relatedEntity' && att.kind !== 'relatedEntities') {
            return null;
        }
        return getAttribute(att.path, attributeName.join('.'));
    }
});
