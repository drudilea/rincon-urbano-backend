getWeekOfTheYear = () => {
  const todayInMilis = Date.now()
  const zoneDate = new Date(todayInMilis)
  const zoneWeekYear = `${zoneDate.getWeek()}-${zoneDate.getWeekYear()}`
  return zoneWeekYear
}

getActualWeekNumber = () => {
  const todayInMilis = Date.now()
  const zoneDate = new Date(todayInMilis)
  const zoneWeek = zoneDate.getWeek()
  return zoneWeek
}

getCurrentMonthWeeks = (currentWeek) => {
  const todayInMilis = Date.now()
  const zoneDate = new Date(todayInMilis)
  const currentMonthWeeks = []

  for (i = 0; i < 4; i += 1)
    currentMonthWeeks.push(`${currentWeek - i}-${zoneDate.getWeekYear()}`)

  return currentMonthWeeks
}

exports.getWeekOfTheYear = getWeekOfTheYear
exports.getActualWeekNumber = getActualWeekNumber
exports.getCurrentMonthWeeks = getCurrentMonthWeeks

/* *******************************
 *  PROTOTYPES AND CLASS-FUNCTIONS
 *********************************/
// Source: https://weeknumber.net/how-to/javascript
Date.prototype.getWeek = function () {
  var date = new Date(this.getTime())
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
  var week1 = new Date(date.getFullYear(), 0, 4)
  // prettier-ignore
  return (
    1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 +  ((week1.getDay() + 6) % 7)) / 7,)
  )
}

Date.prototype.getWeekYear = function () {
  var date = new Date(this.getTime())
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
  return date.getFullYear()
}
