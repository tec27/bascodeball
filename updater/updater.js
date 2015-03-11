let co = require('co')
  , request = require('request')
  , concat = require('concat-stream')
  , jsdom = require('jsdom')
  , regression = require('regression')

let START_YEAR = 1985
  , END_YEAR = 2014
let DATA_URL = `http://apps.washingtonpost.com/sports/apps/live-updating-mens-ncaa-basketball-` +
        `bracket/search/?pri_seed_from=1&pri_seed_to=16&opp_seed_from=1&opp_seed_to=16` +
        `&game_type=7&from=${START_YEAR}&to=${END_YEAR}&submit=`

function concatPromise(input) {
  return new Promise((resolve, reject) => {
    input.pipe(concat(data => {
      resolve(data)
    })).on('error', err => reject(err))
  })
}

function jsdomPromise(html) {
  return new Promise((resolve, reject) => {
    jsdom.env(html, (errors, window) => {
      if (errors) {
        reject(errors)
      } else {
        resolve(window)
      }
    })
  })
}

co(function*() {
  let html = yield concatPromise(request(DATA_URL)).then(data => data.toString('utf8'))
    , window = yield jsdomPromise(html)
    , document = window.document

  let trList = Array.from(document.querySelectorAll('.search-results > tbody > tr'))
  let results = []
  for (let tr of trList) {
    let seeds = Array.from(tr.querySelectorAll('td.seed')).map(elem => +elem.innerHTML)
      , outcomes = Array.from(tr.querySelectorAll('td.team'))
      , winningSeed = outcomes[0].className.includes('win') ? seeds[0] : seeds[1]
      , losingSeed = winningSeed == seeds[0] ? seeds[1] : seeds[0]

    if (winningSeed != losingSeed) {
      results.push({ winner: winningSeed, loser: losingSeed })
    }
  }

  let bySeedDifferential = []
  for (let i = 1; i < 16; i++) {
    let record = results.filter(r => Math.abs(r.winner - r.loser) == i)
      .reduce((s, r) => {
        if (r.winner < r.loser) {
          // if the winner was a better seed, its a "win"
          s.wins++
        } else {
          s.losses++
        }
        return s
      }, { wins: 0, losses: 0 })
    let winrate = record.wins / (record.wins + record.losses)
    if (isNaN(winrate)) {
      winrate = 1
    }
    bySeedDifferential.push([ -i, winrate ])
  }

  let { equation } = regression('linear', bySeedDifferential)
  return { slope: equation[0], intercept: equation[1] }
}).then(equation => {
  console.log('done!')
  console.dir(equation)
}, err => {
  console.error(err.stack)
})
