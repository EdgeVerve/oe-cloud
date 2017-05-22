/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
* @classdesc Contains a single column definition that is used in GridConfig
* <table>
* <tr>
* <th>Field</th>
* <th>Description</th>
* </tr>
* <tr>
* <td>key</td>
* <td>The string to be shown in column header.</td>
* </tr>
* <tr>
* <td>label</td>
* <td>The key of the row to get data from.</td>
* </tr>
* <tr>
* <td>type</td>
* <td>The type of the content that is shown in the column. For example date, timestamp, number, string.</td>
* </tr>
* <tr>
* <td>uiType</td>
* <td>The input control that has to be used for inline editing.</td>
* </tr>
* <tr>
* <td>width</td>
* <td>Width of the column in `px`.</td>
* </tr>
* <tr>
* <td>minWidth</td>
* <td>Min Width of the column in `px`, by default grid level min width will be taken.</td>
* </tr>
* <tr>
* <td>sort</td>
* <td>Sort order of the current column. Takes either `asc` or `desc`.</td>
* </tr>
* <tr>
* <td>firstToSort</td>
* <td> Whether to sort first by desc or asc, by default it is asc.</td>
* </tr>
* <tr>
* <td> formatter </td>
* <td> A custom formatting function which returns the value to show in the cell. </td>
* </tr>
* <tr>
* <td> renderer </td>
* <td> A custom rendering function which returns the element to show in the cell..</td>
* </tr>
* <tr>
* <td> href </td>
* <td> Takes an express styled path and shows the cell content as a `hyperlink` with the provided path. For example, href="/models/customer/:id".</td>
* </tr>
* <tr>
* <td>firstToSort</td>
* <td> Whether to sort first by desc or asc, by default it is asc.</td>
* </tr>
* <tr>
* <td>cellClass</td>
* <td>Class to apply on data table cell</td>
* </tr>
* <tr>
* <td>valueGetter</td>
* <td>A custom getter function which returns a value for the property specified in the `key`.</td>
* </tr>
* <tr>
* <td>cellClassRules</td>
* <td>Object having class name to be applied as key and an expression to evaluate as value</td>
* </tr>
* <tr>
* <td>hidden</td>
* <td>Column will be hidden if it is set to true.</td>
* </tr>
* </table>
* @kind class
* @class GridColumnConfig
* @author Sasivarnan R
*/
