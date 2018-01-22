/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
module.exports = function(Model) {
    var counter = 0;
    Model.observe('before save', function(ctx, next) {
        if (counter < 3) {
            counter++;
            return next(new Error('try again'));
        }
        counter = 0;
        return next();
    });
};                                        
