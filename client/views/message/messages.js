Template.message.hasOwner = function (from) {
    return Meteor.user().username == from;
};

Template.messageBody.isAudio = function () {
    console.log(this.type);
    return this.type === 'audio';
};

Template.messageBody.audioMessage = function (audioId) {
    console.log(audioId);
    return Audios.findOne({'_id': audioId});
};
