
Messages.allow({
    insert: function (userId, doc) {
        return true;
    },
    update: function (userId, doc, fields, modifier) {
        // return doc.owner === userId;
        return true;
    },
    remove: function (userId, doc) {
        // return doc.owner === userId;
        return true;
    },
    fetch: ['owner'],
});


Sessions.allow({
    insert: function (userId, doc) {
        return false;
    },
    update: function (userId, doc, fields, modifier) {
        return false;
    },
    remove: function (userId, doc) {
        // return doc.owner === userId;
        return false;
    }
});


Shuffle.allow({
    insert: function (userId, doc) {
        return true;
    },
    update: function (userId, doc, fields, modifier) {
        // return doc.owner === userId;
        return true;
    },
    remove: function (userId, doc) {
        // return doc.owner === userId;
        return true;
    }
});

Meteor.users.allow({
    update: function (userId, user) {
        return userId === user._id;
    }
});