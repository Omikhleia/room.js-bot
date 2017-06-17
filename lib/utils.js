/* 2017 Omikhleia
 * License: MIT
 *
 * Small pattern matching utilities.
 */
function match(name, search) {
  if (search === undefined) {
    return 'nomatch'
  }

  const xl = name.toLowerCase()
  const yl = search.toLowerCase()
  if (xl === yl) {
    return 'exact'
  }
  if (xl.indexOf(yl) === 0) {
    return xl
  }
  if (xl.split(' ').pop() === yl) {
    return xl
  }
  return 'nomatch'
}

function lookup(list, search) {
  let found = 'nomatch'
  if (list) {
    for (let item of list) {
      found = match(item, search)
      if (found !== 'nomatch') {
        break
      }
    }
  }
  return found
}

module.exports = { lookup }
