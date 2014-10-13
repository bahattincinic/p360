Template.home.events({
    'click .updateMenu': function(e, t){
        if($('body').hasClass('show-updatemenu')){
            $('body').removeClass('show-updatemenu');
            $('.navbar-fixed-top').css('left', '0px');
            if(e.currentTarget.getAttribute('data-toogle') == 'mobile-menu'){
                $('.navbar-fixed-top').css('margin-left', '0px');
            }else {
                $('#content').removeClass('showMenu');
            }
        }else{
            $('body').addClass('show-updatemenu');
            $('.navbar-fixed-top').css('left', '250px');
            if(e.currentTarget.getAttribute('data-toogle') == 'mobile-menu'){
                $('.navbar-fixed-top').css('margin-left', '250px');
            }else {
                $('#content').addClass('showMenu');
            }
        }
    },
    'click #logoutAction': function(e, t){
        Meteor.logout(function(err){
            if(!err && socket) {
                socket.emit('loggedOut');
                $('body').addClass('login');
            }
        })
        return false;
    },
    'submit #changeForm': function(e, form){
        e.preventDefault();
        var username =  form.find('#update-username').value;
        var new_password = form.find('#new-password').value;
        Meteor.call('checkUsername', username, function(err, result){
            if(result && Meteor.user().username != username){
                alertify.error("username already exists");
            }else{
                Meteor.users.update(
                    { '_id': Meteor.userId() },
                    { $set: { 'username': username} }
                );
                // change new_password
                if(new_password !== ''){
                     Accounts.setPassword(Meteor.userId(), new_password);
                }
                alertify.success("Profile has been updated");
            }
        });
    },
    'change .avatarInput': function(event, template) {
        if(event.target.files.length == 0){
            // empty data
            return false;
        }
        var fsFile = new FS.File(event.target.files[0]);
        fsFile.owner = Meteor.userId();
        var image = Images.insert(fsFile, function (err) {
              if (err){
                alertify.error("Avatar could not be updated");
                throw err;
              }else{
                alertify.success("Avatar has been updated");
              }
        });
        var imageId = image._id;
        Meteor.users.update({'_id': Meteor.userId()},
            {$set : {'avatarId': imageId}},
            function(err) {
                if (err) throw err;}
        );
    }
});

Template.home.getUserAvatar = function(){
    var user = Meteor.users.findOne({'_id': Meteor.userId()});
    return Images.findOne({'_id': user.avatarId});
}

Meteor.startup(function(){
    $('body').addClass('login');
});