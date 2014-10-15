Template.message.hasOwner = function (from) {
    return Meteor.user().username == from;
};