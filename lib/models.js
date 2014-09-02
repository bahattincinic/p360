/*
Session (oneToOne User)
===========================
user (FK)
sessionCount (INT) (Aktif oldugu cihaz sayisi)
sessions (Array(SocketIO Id) => Multi Tab/Mobile)
talking (BOOL) (konusuyor mu ?)

Messages
===========================
roomId (INT)
createdAt (DATE)
authorId (INT) (Yazan)
targetId (INT) (Yazilan)

Room ('autorun' eventi yazilicak count == 2 ise kayit silinecek.)
===========================
sessions (Array[Sessions])
roomId (SocketIO Id)
# user discounnet ise buraya user id yi eklicez.
stopWatch (Array[UserId]) --> Count == 2 Room Sil.

Shuffle ('anlik request yapan kullanici listesi *sadece tek
kayit ileride rediste tutulacak* ')
===========================
shuffle -> set(userId)

*/

Sessions = new Meteor.Collection('sessions');
Messages = new Meteor.Collection('messages');
Shuffle = new Meteor.Collection('shuffle');
Rooms = new Meteor.Collection('rooms');

Messages.allow({
    insert: function (userId, doc) {
        console.log('inserting' + userId + ' and doc: ' + doc);
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
        console.log('inserting' + userId + ' and doc: ' + doc);
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


Shuffle.allow({
    insert: function (userId, doc) {
        console.log('inserting' + userId + ' and doc: ' + doc);
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