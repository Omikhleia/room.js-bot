const io = require('socket.io-client')
const RiveScript = require('rivescript')
const ansiToText = require('ansi_up').ansi_to_text
const onExit = require('./on-exit')
const ConversationHandler = require('./conversation-handler')

const fs = require('fs')
const path = require('path').posix
const mkdirp = require('mkdirp')

class RoomJSBot {
  constructor (logger, config) {
    this.logger = logger.child({ component: 'bot' })
    this.config = config
    
    // TODO FIXME
    this.config.selection = '1' // For now, in case there are several characters, 
                                // pick the first - kind of a hack...
                                // (We should perhaps rather use our last saved name)
    
    this.state = 'unauthenticated'
    
    this.bot = new RiveScript({ 
      debug: this.config.logLevel === 'trace',
      onDebug: this.onBotDebug.bind(this)
    })
    
    this.conversation = new ConversationHandler(this.bot)
    
    this.bot.loadDirectory('brain',
      batch_num => {
        this.logger.debug(`main brain loaded (${batch_num})`)
        this.bot.sortReplies()
        
        this.bot.loadDirectory(path.join('bot-data', this.config.username, 'brain'),
          batch_num => {
            this.logger.debug(`specific brain loaded (${batch_num})`)
            this.bot.sortReplies()
            this.setupClient()
          },
          error => {
            // Bots may not have a specific brain, so debug only
            this.logger.debug({ error }, 'specific brain error')
            this.setupClient()
          }
        )
      },
      error => {
        this.logger.warn({ error }, 'main brain error')
      }
    )
  }

  setupClient() {
    this.loadSync()       
    onExit(() => this.saveSync())
    
    this.socket = io('http://localhost:8888') // TODO from configuration
    
    // SocketIO standard events
    this.socket.on('connect', socket => {
      this.logger.debug('connected')
      this.state = 'connected'
      this.socket.emit('input', 'login')
    })
    this.socket.on('connecting', socket => {
      this.logger.debug('connecting')
    })
    this.socket.on('disconnect', socket => {
      this.state = 'disconnected'
      this.logger.debug('disconnect')
    })
    this.socket.on('connect_timeout', socket => {
      this.logger.debug('connect_timeout')
    })
    this.socket.on('connect_error', socket => {
      this.logger.debug('connect_error')
    })
    this.socket.on('error', socket => {
      this.logger.debug('error')
    })
    this.socket.on('reconnect_failed', socket => {
      this.logger.debug('reconnect_failed');
    })
    this.socket.on('reconnect', socket => {
      this.logger.debug('reconnect')
      this.state = 'connected'      
    })
    this.socket.on('reconnecting', socket => {
      this.logger.debug('reconnecting')
    })
    
    // RoomJS game engine event
    this.socket.on('output', this.onOutput.bind(this))
    this.socket.on('set-prompt', this.onSetPrompt.bind(this))
    this.socket.on('request-input', this.onRequestInput.bind(this))
    this.socket.on('login', this.onLogin.bind(this))
    this.socket.on('logout', this.onLogout.bind(this))
    this.socket.on('playing', this.onPlaying.bind(this))
    this.socket.on('quit', this.onQuit.bind(this))
  }
  
  onOutput(msg) {
    if (this.state !== 'playing') {
      if ((msg.search(/Invalid/) !== -1)
          || (msg.search(/You have no character/) !== -1)) {
        // Trap rejection messages from game engine at login or play
        this.logger.fatal({ error: ansiToText(msg) }, 'invalid credentials')
        process.exit(2);
      }

    } else if (this.state === 'playing') {
      if (msg.text) {
        // Support for extented client with JSON payload.
        msg = msg.text
      }

      if (typeof msg === 'string') {
        this.conversation.process(msg, reply => {
          if (reply.lastIndexOf('quit') == 0) {
             // Keep track of our own quit command
             this.selfQuitFlag = true
          }
          this.socket.emit('input', reply)
        })
      }
    }
  }

  onSetPrompt(str) {
    this.logger.debug('setprompt', `- setprompt ${str}`)
    this.bot.setVariable('name', str)
  }

  onLogin() {
    this.logger.debug('login')
    this.state = 'authenticated'
    this.socket.emit('input', 'play')
  }

  onLogout() {
    this.logger.debug('logout')
    this.state = 'connected'

    this.socket.close()
    this.saveSync()

    if (this.selfQuitFlag) {
      this.logger.info('exit (requested by bot)')
      process.exit(0)
    } else {
      // The only other case for 'quit' to be emitted is when 
      // we kicked out from another session. If that other session
      // is a bot too, it may have loaded the bot and user variables
      // and we don't watch them currently, so it's possible our 
      // saving above has no effect. (FIXME)
      this.logger.fatal('exit (kicked out)')
      process.exit(2)
    }
  }

  onPlaying() {
    this.logger.info('playing')
    this.state = 'playing'
  }

  onQuit() {
    this.logger.debug('quit')
    this.state = 'authenticated'
    this.socket.emit('input', 'logout')
  }

  onRequestInput(inputs, fn) {
    let response = {}
    inputs.forEach(obj => {
      response[obj.name] = this.config[obj.name]
    })

    fn(response)
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