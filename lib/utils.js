Meteor.assert = function(condition, message) {
    if (!condition) {
        message = message || 'Assertion failed';
        throw new Meteor.Error(500, message);
    }
};