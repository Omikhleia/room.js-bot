/* 2017 Omikhleia
 * License: MIT
 *
 * RoomJS bot client.
 */
const fs = require('fs')
const path = require('path').posix
const mkdirp = require('mkdirp')
const chokidar = require('chokidar')

const RiveScript = require('rivescript')

const RoomJSClient = require('./room-js-client')
const onExit = require('./on-exit')
const ConversationHandler = require('./conversation-handler')
const DelayedQueue = require('./delayed-queue')
const utils = require('./utils')

class RoomJSBot extends RoomJSClient {
  constructor (logger, config) {
    super(logger, config)

    this.config.selection = '1' // FIXME
                                // Select 1st character until pull request #162
                                // approved on game engine
    this.context = {}
    this.inactivityTimer = null
    this.queue = new DelayedQueue(this.config.speed)
    this.prefix = path.join('bot-data', this.config.character.toLowerCase())

    this.setupBot((success) => {
      if (success) {
        chokidar.watch(['brain', path.join(this.prefix, 'brain')],
                       { depth: 1, ignoreInitial: true })
          .on('all', this.onBrainChanged.bind(this))
          .on('error', error => this.logger.debug(`watcher error ${error}`))
        this.setupClient()
      }
    })
  }

  setupBot (onDone) {
    this.bot = new RiveScript({
      debug: this.config.logLevel === 'trace',
      onDebug: this.onBotDebug.bind(this)
    })

    this.bot.setSubroutine('checkInventory', (scope, star) => {
      const item = star[0]
      const found = utils.lookup(this.context.inventory, item)

      if (found === 'exact') {
        this.bot.setVariable('callcontext', item)
        return 'exact'
      }
      this.bot.setVariable('callcontext', found)
      return found
    })

    this.bot.setSubroutine('checkRoom', (scope, star) => {
      const item = star[0]
      const found = utils.lookup(this.context.contents, item)

      if (found === 'exact') {
        this.bot.setVariable('callcontext', item)
        return 'exact'
      }
      this.bot.setVariable('callcontext', found)
      return found
    })

    this.bot.setSubroutine('checkPlayers', (scope, star) => {
      const name = star[0]
      let found = 'undefined'
      if (this.context.players) {
        for (let player of this.context.players) {
          if (name.toLowerCase() === player.name.toLowerCase()) {
            found = player.name
            break
          }
        }
      }
      this.bot.setVariable('callcontext', found)
      return found
    })

    this.bot.setSubroutine('getRoomName', () => {
      const room = this.context.room ? this.context.room : 'undefined'
      return room
    })

    this.conversation = new ConversationHandler(this.bot, this.logger)

    this.bot.loadDirectory('brain',
      batchNum => {
        this.logger.debug(`main brain loaded (${batchNum})`)
        this.bot.sortReplies()

        this.bot.loadDirectory(path.join(this.prefix, 'brain'),
          batchNum => {
            this.logger.debug(`specific brain loaded (${batchNum})`)
            this.bot.sortReplies()
            onDone(true)
          },
          error => {
            // Bots may not have a specific brain, so debug only
            this.logger.debug({ error }, 'specific brain error')
            onDone(true)
          }
        )
      },
      error => {
        this.logger.warn({ error }, 'main brain error')
        onDone(false)
      }
    )
  }

  /* extend */
  setupClient () {
    this.loadSync()
    onExit(() => this.saveSync())
    super.setupClient()

    this.queue.on('data', (message) => {
      this.send(message)
    })
    this.queue.on('empty', () => {
      if (this.inactivityTimer) {
        clearTimeout(this.inactivityTimer)
        this.inactivityTimer = null
      }
      this.inactivityTimer = setTimeout(() => {
        this.logger.trace('inactivity timeout')
        this.onOutput('system pings.')
      }, this.config.inactivity)
    })
    this.queue.on('queued', () => {
      if (this.inactivityTimer) {
        clearTimeout(this.inactivityTimer)
        this.inactivityTimer = null
      }
    })
  }

  /* extend */
  closeClient () {
    this.saveSync()
    super.closeClient()
  }

  onBrainChanged (event, file) {
    this.logger.debug(`bot reloading on file ${event} (${file})`)
    this.saveSync()

    this.setupBot((success) => {
      this.loadSync()

      if (success) {
        this.logger.info('bot reloaded (brain change)')
      } else {
        this.logger.warn('failure reloading bot (ignored)')
      }
    })
  }

  /* extend */
  onOutput (msg) {
    super.onOutput(msg)

    if (typeof msg === 'object') {
      // Support for extented game worlds with JSON payloads.
      this.logger.debug('context updated')
      this.context = Object.assign(this.context, msg)
      msg = msg.text ? msg.text : msg
    }

    if (this.state === 'playing') {
      if (typeof msg === 'string') {
        this.conversation.process(msg, reply => {
          if (reply.lastIndexOf('quit') === 0) {
             // Keep track of our own quit command
            this.selfQuitFlag = true
          }
          this.queue.push(reply)
        })
      }
    }
  }

  /* override */
  onSetPrompt (str) {
    this.logger.debug('setprompt', `- setprompt ${str}`)
    this.bot.setVariable('name', str)
  }

  onBotDebug (message) {
    this.logger.trace({ message }, 'bot debug')
  }

  saveSync () {
    this.saveBotSync(this.prefix, 'botvars.json')
    this.saveUsersSync(this.prefix, 'uservars.json')
  }

  loadSync () {
    this.loadBotSync(this.prefix, 'botvars.json')
    this.loadUsersSync(this.prefix, 'uservars.json')
  }

  saveUsersSync (dirname, filename) {
    const filepath = path.join(dirname, filename)
    const contents = `${JSON.stringify(this.bot.getUservars(), null, '  ')}\n`

    mkdirp.sync(dirname)
    fs.writeFileSync(filepath, contents)
    this.logger.debug('user variables saved')
  }

  loadUsersSync (dirname, filename) {
    const filepath = path.join(dirname, filename)
    try {
      const contents = JSON.parse(fs.readFileSync(filepath))
      Object.keys(contents).forEach(user => {
        this.bot.setUservars(user, contents[user])
      })
      this.logger.debug('user variables retrieved')
    } catch (error) {
      this.logger.warn({ error: error.message }, 'user variables could not be retrieved')
    }
  }

  saveBotSync (dirname, filename) {
    const filepath = path.join(dirname, filename)
    const contents = `${JSON.stringify(this.bot.deparse().begin.var, null, '  ')}\n`

    mkdirp.sync(dirname)
    fs.writeFileSync(filepath, contents)
    this.logger.debug('bot variables saved')
  }

  loadBotSync (dirname, filename) {
    const filepath = path.join(dirname, filename)
    try {
      const contents = JSON.parse(fs.readFileSync(filepath))
      Object.keys(contents).forEach(variable => {
        this.bot.setVariable(variable, contents[variable])
      })
      this.logger.debug('bot variables retrieved')
    } catch (error) {
      this.logger.warn({ error: error.message }, 'bot variables could not be retrieved')
    }
  }
}

module.exports = RoomJSBot
