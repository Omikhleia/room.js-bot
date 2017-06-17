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
const stripAnsi = require('strip-ansi')

const RoomJSClient = require('./room-js-client')

const onExit = require('./on-exit')
const ConversationHandler = require('./conversation-handler')
const utils = require('./utils')

class RoomJSBot extends RoomJSClient {
  constructor (logger, config) {
    super(logger, config)
    
    this.config.selection = '1' // FIXME 
                                // Select 1st character until pull request #162
                                // approved on game engine
    
    this.setupBot((success) => {
      if (success) {
        chokidar.watch(['brain', path.join('bot-data', this.config.username, 'brain')],
                       { depth: 1, ignoreInitial: true })
          .on('all', this.onBrainChanged.bind(this))
          .on('error', error => this.logger.debug(`watcher error ${error}`))
        this.setupClient()
      }
    })
  }

  setupBot(callback) {
    this.bot = new RiveScript({ 
      debug: this.config.logLevel === 'trace',
      onDebug: this.onBotDebug.bind(this)
    })
    
    this.bot.setSubroutine('checkInventory', (scope, star) => {
      const item = star[0]
      const found = utils.lookup(this.inventory, item)

      if (found === 'exact') {
        this.bot.setVariable('callcontext', item)
        return 'exact'
      }
      this.bot.setVariable('callcontext', found)
      return found
    })
    
    this.conversation = new ConversationHandler(this.bot, this.logger)
    
    this.bot.loadDirectory('brain',
      batch_num => {
        this.logger.debug(`main brain loaded (${batch_num})`)
        this.bot.sortReplies()
        
        this.bot.loadDirectory(path.join('bot-data', this.config.username, 'brain'),
          batch_num => {
            this.logger.debug(`specific brain loaded (${batch_num})`)
            this.bot.sortReplies()
            callback(true)
          },
          error => {
            // Bots may not have a specific brain, so debug only
            this.logger.debug({ error }, 'specific brain error')
            callback(true)
          }
        )
      },
      error => {
        this.logger.warn({ error }, 'main brain error')
        callback(false)
      }
    )
  }

  /* extend */
  setupClient() {
    this.loadSync()       
    onExit(() => this.saveSync())
    super.setupClient()
  }

  /* extend */
  closeClient() {
    this.saveSync()
    super.closeClient()
  }

  onBrainChanged(event, file) {
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
  onOutput(msg) {
    super.onOutput(msg)
    
    if (msg.inventory) { // FIXME refactor
      //  Support for extented client with JSON payload.
      this.logger.debug('inventory updated')
      this.inventory = msg.inventory
    }

    if (this.state === 'playing') {
      if (msg.text) {
        // Support for extented client with JSON payload.
        msg = msg.text
      }
      
      if (typeof msg === 'string') {
        this.conversation.process(msg, reply => {
          if (reply.lastIndexOf('quit') === 0) {
             // Keep track of our own quit command
             this.selfQuitFlag = true
          }
          this.socket.emit('input', reply)
        })
      }
    }
  }

  /* override */
  onSetPrompt(str) {
    this.logger.debug('setprompt', `- setprompt ${str}`)
    this.bot.setVariable('name', str)
  }

  onBotDebug(message) {
    this.logger.trace({ message }, 'bot debug')
  }

  saveSync() {
    this.saveBotSync(`bot-data/${this.config.username}`, 'botvars.json')
    this.saveUsersSync(`bot-data/${this.config.username}`, 'uservars.json')
  }

  loadSync() {
    this.loadBotSync(`bot-data/${this.config.username}`, 'botvars.json')
    this.loadUsersSync(`bot-data/${this.config.username}`, 'uservars.json')
  }

  saveUsersSync(dirname, filename) {
    const filepath = path.join(dirname, filename)
    const contents = `${JSON.stringify(this.bot.getUservars(), null, '  ')}\n`

    mkdirp.sync(dirname)
    fs.writeFileSync(filepath, contents)
    this.logger.debug('user variables saved')
  }

  loadUsersSync(dirname, filename) {
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

  saveBotSync(dirname, filename) {
    const filepath = path.join(dirname, filename)
    const contents = `${JSON.stringify(this.bot.deparse().begin.var, null, '  ')}\n`

    mkdirp.sync(dirname)
    fs.writeFileSync(filepath, contents)
    this.logger.debug('bot variables saved')
  }

  loadBotSync(dirname, filename) {
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
