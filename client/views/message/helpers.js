Template.message.helpers({
    hasOwner: function (from) {
        return Meteor.user().username == from;
    },
});

Template.messageBody.helpers({
    isAudio: function () {
        return this.type === 'audio';
    },
    audioMessage: function(audioId){
       return Audios.findOne({'_id': audioId});
    }
});