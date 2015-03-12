require('babel/polyfill')
let bball = require('./lib/bascodeball')

let React = require('react')
  , Router = require('react-router')
  , injectTapEventPlugin = require('react-tap-event-plugin')
  , App = require('./lib/app.jsx')

injectTapEventPlugin()

let { DefaultRoute, NotFoundRoute, Route } = Router
let routes = (
  <Route name="home" path="/C:/Users/Travis/Documents/Projects/bascodeball/index.htm" handler={App}>
  </Route>
)

Router.run(routes, Router.HistoryLocation,
    Handler => React.render(<Handler />, document.getElementById('app')))

var roundNames = [ "first", "second", "third", "fourth", "fifth", "sixth", "seventh" ]
$.fn.buildBracket = function(rounds) {
  var html = ''
  _.each(rounds, function(r, roundNum) {
    html += '<div class="round ' + roundNames[roundNum] + '">'
    _.each(r, function(o, i, l) {
      if(i%2 === 0) html += '<div class="matchup">'
      html += '<div class="team ' + o.winner.quadrant + '"'
      html += ' title="' + _.escape(o.toString()) + '">' + _.escape(o.toString()) + '</div>'
      if(i%2 !== 0) html += '</div>'
    })
    html += '</div>'
  })
  this.html(html)
}

let teams, bracket
$(function() {
  "use strict"
  teams = require('./teams.json')
  _.each(teams, function(val, key) {
    teams[key] = _.map(val,function(team) {
      return new bball.Team(team.name, team.sagarin, team.seed, key)
    })
  })

  bracket = bball.buildFullTourneyBracket(teams)
  function getNewBracket() {
    var rounds = bracket.getOutcome().getRoundArrays()
    $('#bracket').buildBracket(rounds)
  }

  function generateCharts() {
    var n = 100000

    var charts = [
      { div: $('#champ-chart'), func: simulateChampions },
      { div: $('#finalfour-chart'), func: simulateFinalFours },
      { div: $('#topeight-chart'), func: simulateTopEight },
      { div: $('#upset-chart'), func: simulateUpsets },
      { div: $('#upsetby-chart'), func: simulateUpsetsBy }
    ]
    _.each(charts, function(chart) {
      chart.data = {}
    })

    var i = 0, progress = $('#chart-progress').text('').css('display', 'block')
    _.defer(function deferredGenerator() {
      progress.text('Simulation ' + i + ' / ' + n)
      runSimulation(100, function(out) {
        _.each(charts, function(chart) {
          chart.func.call(this, chart.data, out)
        })
        i++
      })
      if(i < n) _.defer(deferredGenerator)
      else render()
    })

    function render() {
      progress.text('Rendering...')

      _.each(charts, function(chart) {
        var sortedData = _.sortBy(chart.data, function(val) { return val.times }).reverse()
        outputBarForTeams(chart.div, sortedData, n)
      })

      progress.css('display', 'none')
    }
  }

  $('#gen-new-bracket').on('click', function(e) {
    setTimeout(getNewBracket, 15)
    e.preventDefault()
  })

  $('#gen-charts').on('click', function(e) {
    setTimeout(generateCharts, 15)
    e.preventDefault()
  })

  getNewBracket()
})

function runSimulation(n, outcomeCallback) {
  for (var i = 0; i < n; i++) {
    outcomeCallback(bracket.getOutcome())
  }
}

function simulateChampions(winners, out) {
  if(winners[out.winner.name]) return winners[out.winner.name].times++
  winners[out.winner.name] = { times: 1, team: out.winner }
}

function simulateFinalFours(winners, out) {
  var left = out.childA,
    right = out.childB,
    finalFour = [ left.childA.winner, left.childB.winner, right.childA.winner, right.childB.winner ]

  _.each(finalFour, function(winner) {
    if(winners[winner.name]) return winners[winner.name].times++
    winners[winner.name] = { times: 1, team: winner }
  })
}

function simulateTopEight(winners, out) {
  var left = out.childA,
    right = out.childB,
    leftLeft = left.childA,
    leftRight = left.childB,
    rightLeft = right.childA,
    rightRight = right.childB,
    topEight = [
      leftLeft.childA.winner, leftLeft.childB.winner,
      leftRight.childA.winner, leftRight.childB.winner,
      rightLeft.childA.winner, rightLeft.childB.winner,
      rightRight.childA.winner, rightRight.childB.winner
    ]

  _.each(topEight, function(winner) {
    if(winners[winner.name]) return winners[winner.name].times++
    winners[winner.name] = { times: 1, team: winner }
  })
}

function simulateUpsets(upsets, out) {
  function traverseOutcomes(root) {
    var winnerA, winnerB
    if(root.childA) winnerA = traverseOutcomes(root.childA)
    if(root.childB) winnerB = traverseOutcomes(root.childB)
    if(!winnerA || !winnerB) return root.winner

    if(root.winner.name === winnerA.name && winnerA.seed > 8 && winnerA.seed - winnerB.seed >= 4) {
      if(upsets[winnerB.name]) upsets[winnerB.name].times++
      else upsets[winnerB.name] = { times: 1, team: winnerB }
    }
    else if(root.winner.name == winnerB.name && winnerB.seed > 8 && winnerB.seed - winnerA.seed >= 4) {
      if(upsets[winnerA.name]) upsets[winnerA.name].times++
      else upsets[winnerA.name] = { times: 1, team: winnerA }
    }

    return root.winner
  }

  traverseOutcomes(out)
}

function simulateUpsetsBy(upsets, out) {
  function traverseOutcomes(root) {
    var winnerA, winnerB
    if(root.childA) winnerA = traverseOutcomes(root.childA)
    if(root.childB) winnerB = traverseOutcomes(root.childB)
    if(!winnerA || !winnerB) return root.winner

    if(root.winner.name === winnerA.name && winnerA.seed > 8 && winnerA.seed - winnerB.seed >= 4) {
      if(upsets[winnerA.name]) upsets[winnerA.name].times++
      else upsets[winnerA.name] = { times: 1, team: winnerA }
    }
    else if(root.winner.name == winnerB.name && winnerB.seed > 8 && winnerB.seed - winnerA.seed >= 4) {
      if(upsets[winnerB.name]) upsets[winnerB.name].times++
      else upsets[winnerB.name] = { times: 1, team: winnerB }
    }

    return root.winner
  }

  traverseOutcomes(out)
}

function outputBarForTeams($chart, teams, n) {
  var data = [],
    ticks = []

  _.each(teams, function(teamTimes, i) {
    data.push([ teamTimes.times / n, i*5 ])
    ticks.push([ i*5, teamTimes.team.toString() ])
  })

  $.plot($chart,
    [ { data: data,
      bars: { show: true, barWidth: 2.0, align: 'center', horizontal: true } 
    } ],
    {
      yaxis: { ticks: ticks },
      xaxis: { tickFormatter: function(val) { return Math.round(val*100) + '%' } }
    }
  )
}
