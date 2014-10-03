Template.login.events({
    'submit #login-form': function(e, t) {
        e.preventDefault();
        username = t.find('#account-username').value;
        secret = t.find('#account-secret').value;
        console.log('login ' + username + ":" + secret);

        Meteor.loginWithPassword(username, secret, function(error) {
            console.log('xxx');

            if (!error) {
                // login
                return false;
            }

            throw error;
            console.log('check username');

            // check password
            Meteor.call('checkUsername', username, function(err, result){
                if (err)  {
                    throw err;
                    return;
                }

                if (result){
                    alertify.error("Error username is being used / username or passord invalid");
                    t.find('#account-username').value = '';
                    t.find('#account-secret').value = '';
                } else {
                    // register
                    Accounts.createUser({
                        password: secret,
                        username: username
                    }, function(err, res) {
                        if (err) throw err;
                    });
                }
            });
        });
        return false;
    }
});

Template.login.rendered = function() {
      $.backstretch([
            "slide/slide-1.jpg",
            "slide/slide-2.jpg"
      ], {duration: 3000, fade: 750});
};