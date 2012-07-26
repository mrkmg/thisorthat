Session.set('page','loading');
var current_poll;

Meteor.startup(function(){
  if(amplify.store('voterid')==undefined)
  {
    var myid = Meteor.call('makeNewVoter',function(er,rs){
      if(er) console.log(er);
      else amplify.store('voterid',rs);
    });
  }
  
  var path = window.location.pathname.substr(1);
  if(path != ''){
    Meteor.autosubscribe(function() {
      Meteor.subscribe("polls",path);
      Meteor.subscribe("votes",path);
      Meteor.subscribe("trending");
    });
    var count = 0;
    var checker = function(){
      if(Polls.find({_id:path}).count() == 0){
        Session.set('page','loading');
        count++;
        if(count < 10) Meteor.setTimeout(checker,1000);
        else alert('There was an error loading the poll. Please try again later.');
      }
      else
      {
        current_poll = Polls.findOne({_id:path});
        Session.set('page','vote_poll');
        Votes.find({poll:current_poll._id}).observe({
          removed:voteRemoved,
          added:voteAdded,
          change:updatePollGraph
        });
      }
    }
    checker();
  }
  else
  {
    Meteor.autosubscribe(function() {
      Meteor.subscribe("trending_polls");
    });
    Session.set('page','create_poll');
  }
});

Template.maincontrol.page_is = function(page){
  return Session.get('page') == page;
}

Template.create_poll.trendingpolls = function(){ return Polls.find(); }
Template.create_poll.events = {
  'click #startpoll':function(){
    var name = $('#pollname').val();
    var option1 = $('#option1').val();
    var option2 = $('#option2').val();
    
    if(name == '' || option1 == '' || option2 == '')
    {
      alert('Please fill out all fields');
      return;
    }
    Meteor.call('createPoll',name,option1,option2,function(er,pollid){ if(er) console.log(er); else window.location = '/'+pollid; });
  }
};

Template.trending_item.poll_name = function(){ return this.name; }
Template.trending_item.poll_opt1 = function(){ return this.option1; }
Template.trending_item.poll_opt2 = function(){ return this.option2; }


Template.vote_poll_top.poll_name = function(){ return current_poll.name; }
Template.vote_poll_top.option1 = function(){ return current_poll.option1; }
Template.vote_poll_top.option2 = function(){ return current_poll.option2; }
Template.vote_poll_top.did_vote = function(){ return Votes.find({voter:amplify.store('voterid'),poll:current_poll._id}).count()==1}
Template.vote_poll_top.did_vote_1 = function(){ return Votes.find({option:1,voter:amplify.store('voterid'),poll:current_poll._id}).count()==1}
Template.vote_poll_top.did_vote_2 = function(){ return Votes.find({option:2,voter:amplify.store('voterid'),poll:current_poll._id}).count()==1}
Template.vote_poll_top.count1 = function(){ return Votes.find({option:1,poll:current_poll._id}).count() }
Template.vote_poll_top.count2 = function(){ return Votes.find({option:2,poll:current_poll._id}).count() }
Template.vote_poll_top.poll_link = function(){ return  window.location; }
Template.vote_poll_top.events = {
  'click #vote1':function(){
    Meteor.call('insertMyVote',1,current_poll._id,amplify.store('voterid'));
  },
  'click #vote2':function(){
    Meteor.call('insertMyVote',2,current_poll._id,amplify.store('voterid'));
  },
  'click #rmvote':function(){
    Meteor.call('removeMyVote',current_poll._id,amplify.store('voterid'));
  }
}


Template.vote_poll_chart.show_graph = function(){
  Meteor.defer(function () {
    createPollGraph();
    (function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s); js.id = id;
      js.src = "//connect.facebook.net/en_US/all.js#xfbml=1&appId=208408262559870";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
    document.title = document.title+': '+current_poll.name;
  });
  return '';
};

var showing = false;
function voteAdded(vote)
{
  updatePollGraph();
  if(showing) return;
  showing = true;
  if(vote.option == 1)
  {
    var option = current_poll.option1;
  }
  else
  {
    var option = current_poll.option2;
  }
  $('#alert_box').text('Vote added to '+option+'.').slideDown();
  setTimeout(function(){  $('#alert_box').slideUp(function(){showing=false;});  },1000);
}

function voteRemoved(vote)
{
  updatePollGraph();
  if(showing) return;
  showing = true;
  if(vote.option == 1)
  {
    var option = current_poll.option1;
  }
  else
  {
    var option = current_poll.option2;
  }
  $('#alert_box').text('Vote removed from '+option+'.').slideDown();
  setTimeout(function(){  $('#alert_box').slideUp(function(){showing=false;});  },1000);
}

var chart;
function createPollGraph()
{
  var count1 = Votes.find({option:1,poll:current_poll._id}).count();
  var count2 = Votes.find({option:2,poll:current_poll._id}).count();
  
  if(count1 == 0 && count2 == 0) count1 = count2 = 1;
  
  chart = new Highcharts.Chart({
          chart: {
                  renderTo: 'graph',
                  plotBackgroundColor: null,
                  plotBorderWidth: null,
                  plotShadow: false,
                  animation:true
          },
          title: {
                  text: current_poll.name+'?'
          },
          tooltip: {
                  formatter: function() {
                          return '<b>'+ this.point.name +'</b>: '+ this.point.y +' ('+ Math.round(this.percentage) +'%)';
                  }
          },
          plotOptions: {
                  pie: {
                          allowPointSelect: true,
                          cursor: 'pointer',
                          dataLabels: {
                                  enabled: true,
                                  color: '#000000',
                                  connectorColor: '#000000',
                                  formatter: function() {
                                          return '<b>'+ this.point.name +'</b>: '+ Math.round(this.percentage) +' %';
                                  }
                          }
                  }
          },
          series: [{
                  type: 'pie',
                  name: current_poll.name+'?',
                  data: [
                          [current_poll.option2,count2],
                          [current_poll.option1,count1]
                  ]
          }]
  });
}

function updatePollGraph()
{
  if(chart)
  {
    var count1 = Votes.find({option:1,poll:current_poll._id}).count();
    var count2 = Votes.find({option:2,poll:current_poll._id}).count();
    
    if(count1 == 0 && count2 == 0) count1 = count2 = 1;
    
    chart.series[0].data[1].update(count1,false);
    chart.series[0].data[0].update(count2,true);
  }
}