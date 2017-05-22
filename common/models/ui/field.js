/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
* @classdesc This model stores the field level metadata for UI.
* This data is auto-referenced by UIMetadata model during rendering phase based on model property-name.
* It can also be explicitly referenced.
* The model has following properties
* <pre>
* Property   |              Description
* -----------|-------------------------------
* `key`      | Field key
* `uitype`   | decides how this field will be rendered on UI (text, date, number, boolean etc.)
* `default`  | default value to be populated in UI on an empty form.
* `label`    | label to be displayed in UI.
* `required` | set to true if field should be mandatory in UI
* `disabled` | set to true if field should be disabled in UI
* `hidden`   | set to true if field should be hidden in UI
* `class`    | CSS classes to be applied on the rendered control
* `minlength`| Minimum length for a valid input (applicable to text input)
* `maxlength`| Maximum length for a valid input (applicable to text input)
* `min`      | Minimum value for a valid input (applicable to date and number input)
* `max`      | Maximum value for a valid input (applicable to date and number input)
* `precision`| Decimal precision to be applied in number formatting (applicable to number input)
* `pattern`  | Input should match to specified pattern
* `listdata` | Array of valid values. When specified, the field is rendered as a dropdown control
* `listurl`  | If specified, dropdown control can pull list of valid values by invoking this url.
* </pre>
*
* @kind class
* @class Field
* @author Rohit Khode
*/
