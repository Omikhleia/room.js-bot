/* 2017 Omikhleia
 * License: MIT
 *
 * Delayed queue for bot answers, pumping replies at some rate
 * mimicking a human.
 * 200-300 CPM is fast for humans, but slow for bots, yet we do not want
 * the bot to answer too quickly and spam the discussion. (Moreover, think
 * about having several interacting bots in a room...)
 */
const EventEmitter = require('events').EventEmitter

class DelayedQueue extends EventEmitter {
  constructor (charsPerMinute) {
    super()
    this.queue = []
    this.timer = null
    this.CPM = charsPerMinute || 800
  }

  push (element) {
    this.queue.push(element)
    this.emit('queued')
    this.schedule()
  }

  /* private */
  schedule () {
    if (this.queue.length === 0) {
      this.emit('empty')
    } else if (!this.timer) {
      const delay = Math.ceil(this.queue[0].toString().length / this.CPM * 60 * 1000)
      this.timer = setTimeout(() => {
        this.timer = null
        const element = this.queue.shift()
        this.emit('data', element)
        this.schedule()
      }, delay)
    }
  }
}

module.exports = DelayedQueue
