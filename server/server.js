_.extend(Meteor.Collection.prototype, {
  remove_client_access: function(methods){
    var self = this;
    if(!methods) methods = ['insert','update','remove'];
    if(typeof methods === 'String') methods = [methods];
    _.each(methods, function(method){
      Meteor.default_server.method_handlers[self._prefix + method] = function(){}
    });
  }
});

Meteor.startup(function () {
  Voters.remove_client_access();
  Polls.remove_client_access();
  Votes.remove_client_access();
  Trending.remove_client_access();
  
  
  Meteor.publish("polls",function(pollid){
    return Polls.find({_id:pollid});
  });
  
  Meteor.publish("votes",function(pollid){
    return Votes.find({poll:pollid});
  });
  
  Meteor.publish("trending",function(pollid){
    return Trending.find({votes:{$gt:0}},{sort:{votes:-1},limit:10});
  });
  
  Meteor.publish("trending_polls",function(){
    var trendlist = [];
    Trending.find({votes:{$gt:0}},{sort:{votes:-1},limit:10}).forEach(function(trend){
      trendlist.push(trend.poll);
    });
    return Polls.find({_id:{$in:trendlist}});
  })
  

  Meteor.methods({
    insertMyVote:function(option,poll,voter){
      if(Voters.find({_id:voter}).count()==1)
      {
        Trending.update({poll:poll},{$inc:{votes:1}});
        Votes.remove({poll:poll,voter:voter});
        return Votes.insert({option:option,poll:poll,voter:voter});
      }
      else
      {
        alert('User does not exist. What are you trying to do, cheat?');
        return false;
      }
    },
    removeMyVote:function(poll,voter){
      Trending.update({poll:poll},{$inc:{votes:-1}});
      return Votes.remove({poll:poll,voter:voter});
    },
    createPoll:function(name,option1,option2)
    {
      var id = Polls.insert({name:name,option1:option1,option2:option2});
      Trending.insert({poll:id,votes:1});
      return id;
    },
    makeNewVoter:function(){
      return Voters.insert({});
    },
    getNameForPoll:function(poll)
    {
      return Polls.findOne({_id:poll}).name;
    }
  });
  
  Meteor.setInterval(function(){
    Trending.update({},{$inc:{votes:-1}},true);
  },1800000);
  
  Polls.find().forEach(function(item){
    if(Trending.find({poll:item._id}).count() == 0)
    {
      var count = 1+Votes.find({poll:item._id}).count();
      Trending.insert({poll:item._id,votes:count});
    }
  });
  
});