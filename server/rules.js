
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
        console.log(doc);
        console.log(modifier);
        console.log(userId);
        console.log(fields);
        return true;
    },
    remove: function (userId, doc) {
        // return doc.owner === userId;
        return false;
    },
    fetch: ['sound']
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