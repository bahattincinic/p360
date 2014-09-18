// TODO: check if meteor allows when no callback defined at all

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

Rooms.allow({
    update: function (userId, doc, fields, modifier) {
        var session = Sessions.findOne({'userId': userId});
        if (!session) return false;

        var room = Rooms.findOne(
            {'isActive': true, 'sessions': {$in: [session._id]}});
        console.log('room found');
        if (!room) return false;

        return doc._id == room._id;
    }
});

Images.allow({
    insert: function (userId, doc) {
        return doc.owner == userId;
    },
    update: function (userId, doc, fields, modifier) {
        return doc.owner == userId;
    },
    download: function(userId, file) {
        // everyone can download
        return true;
    }
});