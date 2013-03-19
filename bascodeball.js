/*global $:true, jQuery:true, _:true */
var __module = {};
(function(module) {
  "use strict";

  function getSeedWinProbability(seedA, seedB) {
    // winrate of favored seed = -0.0355x + 0.5  (Max winrate: 99%)
    // where x is the difference between favorite and underdog
    // This was calculated based on data from 1985-2011
    var favorite, underdog;
    if(seedA < seedB) {
      favorite = seedA;
      underdog = seedB;
    }
    else {
      favorite = seedB;
      underdog = seedA;
    }

    var pFavored = Math.min((-0.0316048 * (favorite - underdog)) + 0.5053254, 0.99);
    if(favorite == seedA) return pFavored;
    else return 1 - pFavored;
  }

  function getSagarinWinProbability(sagarinA, sagarinB) {
    return sagarinA / (sagarinA + sagarinB);
  }

  function getCompoundWinProbability(teamA, teamB) {
    var seedWin = getSeedWinProbability(teamA.seed, teamB.seed),
        sagWin = getSagarinWinProbability(teamA.sagarin, teamB.sagarin);

    return Math.min(Math.max(seedWin + (sagWin - 0.5), 0), 0.99);
  }

  function Team(name, sagarin, seed, quadrant) {
    if(!(this instanceof Team)) return new Team(name, sagarin, seed, quadrant);

    this.name = name;
    this.sagarin = sagarin;
    this.seed = seed;
    this.quadrant = quadrant;
  }

  Team.prototype.toString = function() {
    return '#' + this.seed + ' ' + this.name;
  };

  function Matchup(childA, childB) {
    if(!(this instanceof Matchup)) return new Matchup(childA, childB);

    this.childA = childA;
    this.childB = childB;
  }

  Matchup.prototype.getOutcome = function() {
    var teamA, teamB, outcomeA, outcomeB;
    if(this.childA instanceof Team) {
      teamA = this.childA;
      outcomeA = new Outcome(teamA, null, null);
    }
    else { // A is a Matchup
      outcomeA = this.childA.getOutcome();
      teamA = outcomeA.winner;
    }

    if(this.childB instanceof Team) {
      teamB = this.childB;
      outcomeB = new Outcome(teamB, null, null);
    }
    else { // B is a Matchup
      outcomeB = this.childB.getOutcome();
      teamB = outcomeB.winner;
    }

    // calculate winner using mathz
    var aWinProb = getCompoundWinProbability(teamA, teamB);
    var rand = Math.random();
    var winner = rand < aWinProb ? teamA : teamB;
    var out = new Outcome(winner, outcomeA, outcomeB);
    out.playIn = this.playIn;
    return out;
  };

  Matchup.prototype.toString = function() {
    return (this.childA + ' vs ' + this.childB) + (this.playIn ? ' (PI)': '');
  };

  function Outcome(winner, childA, childB) {
    this.winner = winner;
    this.childA = childA;
    this.childB = childB;
  }

  Outcome.prototype.toString = function() {
    if(this.playIn) {
      if(this.winner == this.childA.winner)
        return this.winner + ' (PI > ' + this.childB.winner + ')';
      else
        return this.winner + ' (PI > ' + this.childA.winner + ')';
    }
    else {
      return this.winner;
    }
  };

  // gets an array of the various rounds and their matchups, accounting for play-ins by combining into one entry
  Outcome.prototype.getRoundArrays = function() {
      var q = [], final = [];
      q.push(this);
      while(q.length > 0) {
        var o = q.shift();
        if(o.childA && !o.playIn) q.push(o.childA);
        if(o.childB && !o.playIn) q.push(o.childB);
        final.push(o);
      }

      var cnt = 1, ret = [];
      while(final.length) {
        var newLevel = [];
        for(var i = 0; i < cnt; i++) {
          newLevel.push(final.shift());
        }
        ret.push(newLevel);
        cnt *= 2;
      }
      return ret.reverse();
  };

  module.exports = {
    getSeedWinProbability: getSeedWinProbability,
    getSagarinWinProbability: getSagarinWinProbability,
    getCompoundWinProbability: getCompoundWinProbability,
    buildBracketForTeams: buildBracketForTeams,
    buildFullTourneyBracket: buildFullTourneyBracket,

    Team: Team,
    Matchup: Matchup,
    Outcome: Outcome
  };

  var gameAssignmentOrder = [ 0, 7, 5, 3, 2, 4, 6, 1 ]; // order to assign teams to games for NCAA basketball (I'm too stupid/lazy to algorithmify this)
  function buildBracketForTeams(teams) {
    // takes in an array of teams (seeded 1-16) and builds a starting bracket for them
    // attempts to be intelligent about duplicated seeds (assumes they are play-ins)
    var t = [];
    _.each(
      _.groupBy(teams, function(t) {
        return t.seed - 1;
      }),
      function(seedTeams, seed) {
              if(seedTeams.length === 1) t[seed] = seedTeams[0];
              else {
                t[seed] = new Matchup(seedTeams[0], seedTeams[1]);
                t[seed].playIn = true;
              }
      }
    );

    teams = t;
    if(teams.length !== 16) throw new Error('Can\'t build bracket for seed range != 16');

    var first = 0, last = 15, g = 0, matchups = [];
    while(first < last) {
      matchups[gameAssignmentOrder[g++]] = new Matchup(teams[first++], teams[last--]);
    }
    // generate the right side of the bracket (each iteration is the next round)
    while(matchups.length > 1) {
      var finalMatchups = [];
      for(var i = 0, m = 0; i < matchups.length-1; i += 2, m++) {
        finalMatchups[m] = new Matchup(matchups[i], matchups[i+1]);
      }
      matchups = finalMatchups;
    }

    return matchups[0];
  }

  function buildFullTourneyBracket(regions) {
    // South plays West
    // East plays Midwest
    var regionBrackets =  {};
    _.each(regions, function(teams, regionName) {
      regionBrackets[regionName] = buildBracketForTeams(teams);
    });

    var midwestWestMatch = new Matchup(regionBrackets.midwest, regionBrackets.west);
    var southEastMatch = new Matchup(regionBrackets.south, regionBrackets.east);
    var finals = new Matchup(midwestWestMatch, southEastMatch);
    return finals;
  }
})(__module);

window.BBall = __module.exports;
