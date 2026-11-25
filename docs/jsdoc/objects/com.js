/**
 * Load ActiveX object.
 *
 * @constructor
 * @param {string} name
 *
 * @example
 * const xmlhttp = new ActiveXObject('Microsoft.XMLHTTP');
 */
function ActiveXObject(name) {

    /**
     * Creates an {@link ActiveXObject ActiveXObject} that contains an object of type (VT_ARRAY|SOME_TYPE).
     *
     * @static
     * 
     * @param {Array<*>} arr An array that contains elements of primitive type.
     * @param {number} element_variant_type A variant type of array elements.
     *
     * @return {ActiveXObject}
     * 
     * @example
     * let filename = 'x:\\file.bin';
     * let bin_data = [0x01, 0x00, 0x00, 0x02]
     * let com_bin_data = ActiveXObject.ActiveX_CreateArray(bin_data, 0x11) // VT_UI1
     * 
     * let stm = new ActiveXObject('ADODB.Stream');
     * 
     * stm.Open();
     * stm.Type = 1; //adTypeBinary
     * stm.Write(com_bin_data);
     * stm.SaveToFile(filename, 2);
     * stm.Close();
     */
    this.ActiveX_CreateArray = function (arr, element_variant_type) { };

    /**
     * Emulates COM's weird behaviour of property accessors.
     *
     * @param {number|string} prop_name Name of the property or it's numeric index
     * @return {*}
     *
     * @example
     * some_activex.ActiveX_Get('property_name', 'additional_info').DoSmth();
     * // in COM:
     * // some_activex.Item('property_name', 'additional_info').DoSmth();
     */
    this.ActiveX_Get = function (prop_name) { };

    /**
     * Emulates COM's weird behaviour of property accessors.
     *
     * @param {number|string} prop_name Name of the property or it's numeric index
     *
     * @example
     * some_activex.ActiveX_Set('property_name', 'new_value', 'additional_info');
     * // in COM:
     * // some_activex.Item('property_name', 'additional_info') = "new_value";
     */
    this.ActiveX_Set = function (prop_name) { };
}

/**
 * Deprecated: use <b>for ... of</b> loop instead.
 * 
 * @deprecated
 * 
 * @constructor
 * @param {ActiveXObject} active_x_object Any ActiveX collection object.
 * 
 * @example
     * let e = new Enumerator(active_x_object);
     * for (e.moveFirst(); !e.atEnd(); e.moveNext()) {
     *   console.log(e.item());
     * }
 */
function Enumerator(active_x_object) {

    /**
     * Returns a boolean value indicating if the enumerator has reached the end of the collection.
     *
     * @return {boolean}
     */
    this.atEnd = function () { };

    /**
     * Returns the item at the current enumerator position.
     *
     * @return {*}
     */
    this.item = function () { };

    /**
     * Resets enumerator position to the first item.
     *
     * @method
     */
    this.moveFirst = function () { };

    /**
     * Moves enumerator position to the next item.
     *
     * @method
     */
    this.moveNext = function () { };
}

