/**
 *
 * ©2017-2018 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
module.exports = () => ({
	hasProperty: (obj, propName) => {

		var result = (typeof obj === 'undefined') ? false : (typeof obj[propName] === 'undefined' ? false : true);
		console.log('hasProperty', 'obj:', obj, 'property:', propName, 'result:', result);
		return result;
	}
});