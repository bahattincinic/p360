// global settings for server side
var _Settings = function() {
    var self = this;
    self.countdown = 360;
    self.roomTimeout = 1000 * self.countdown;
    self.clientTimeout = self.countdown;
    self.ioPort = 4000;
    // whether use root_url or not

    if (Meteor.isServer) {
        self.shuffleName = 'x00x';
        self.production = process.env.NODE_ENV == 'production';
        if (self.production) {
            self.uploads = '/uploads';
        } else {
            self.uploads = '~/uploads';
        }
    }
}

Settings = new _Settings();
