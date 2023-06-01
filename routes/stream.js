const express = require('express')
const firebase = require('firebase-admin')
const dates = require('../utils/datesAndTimezones')

var app = express()
var db = firebase.database()

app.post('/week-streams', async (req, res) => {
  const currentWeekOfTheYear = dates.getWeekOfTheYear()

  db.ref('streams')
    .orderByChild('weekNumberOfTheYear')
    .equalTo(currentWeekOfTheYear)
    .once('value', (snapshot) => {
      const currentWeekStreams = snapshot.val()
      if (currentWeekStreams) {
        const currentWeekStreamsList = Object.keys(currentWeekStreams).map(
          (key) => ({
            ...currentWeekStreams[key],
            streamId: key,
          }),
        )
        return res.status(200).json(currentWeekStreamsList)
      }
      return res.status(500).json({ message: 'No streams available' })
    })
})

app.post('/month-streams', async (req, res) => {
  const currentWeekNumber = parseInt(dates.getActualWeekNumber())
  const currentMonthWeeks = getCurrentMonthWeeks(currentWeekNumber)
  let currentMonthStreams = []

  db.ref('streams').once('value', (snapshot) => {
    const historyStreams = snapshot.val()
    if (!historyStreams)
      return res.status(500).json({ message: 'No streams available' })
    const historyStreamsList = Object.keys(historyStreams).map((key) => ({
      ...historyStreams[key],
      streamId: key,
    }))

    historyStreamsList.map((stream) => {
      if (
        stream.weekNumberOfTheYear === currentMonthWeeks[0] ||
        stream.weekNumberOfTheYear === currentMonthWeeks[1] ||
        stream.weekNumberOfTheYear === currentMonthWeeks[2] ||
        stream.weekNumberOfTheYear === currentMonthWeeks[3]
      ) {
        currentMonthStreams.push(stream)
      }
    })

    return res.status(200).json(currentMonthStreams)
  })
})

module.exports = app
