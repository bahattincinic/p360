Template.login.events({
    'submit #login-form': function(e, t) {
        e.preventDefault();
        var username = t.find('#login-username').value,
            password = t.find('#login-password').value;
        Meteor.loginWithPassword(username, password, function(err) {});
        return false;
    },
    'submit #register-form': function(e, t) {
        e.preventDefault();
        var email = t.find('#account-email').value,
            password = t.find('#account-password').value,
            username = t.find('#account-username').value;
        Accounts.createUser({
            email: email,
            password: password,
            username: username
        }, function(err) {});
        return false;
    }
});

Template.login.rendered = function() {
      $.backstretch([
            "http://cdn.omgfacts.com/2014/5/12/14ecf36fda9414b6d1cc67f728dea42c.jpg",
            "http://allaboutlemon.files.wordpress.com/2012/09/earth-photo-from-cosmos-img1261.jpg"
      ], {duration: 3000, fade: 750});
}