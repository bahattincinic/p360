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

Images = new FS.Collection("images", {
  stores: [new FS.Store.FileSystem("images", {path: Settings.uploads})]
});

Audios = new FS.Collection('audios', {
    stores: [new FS.Store.FileSystem('audios', {path: Settings.uploads})]
});

