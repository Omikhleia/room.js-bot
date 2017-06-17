/* 2017 Omikhleia
 * License: MIT
 *
 * Client logic for connecting to RoomJS.
 * This is a base class, intended to be subclassed:
 * Methods marked as 'to be extended' should overloaded for specific behavior
 * and call the base method from this class.
 * Methods marked as 'to be overriden' should be implemented in subclass.
 */
const io = require('socket.io-client')

class RoomJSClient {
  constructor (logger, config) {
    this.logger = logger.child({ component: 'bot' })
    this.config = config
    this.state = 'unauthenticated'
    this.selfQuitFlag = false
  }

  setupClient() {
    // To be extended by derived objects for specific behavior 
    this.socket = io(`http://${this.config.address}:${this.config.port}`)
    
    // SocketIO standard events - state management
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
      this.logger.debug('reconnect_failed')
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

  closeClient() {
    this.socket.close()
    // To be extended by derived objects for specific behavior 
  }

  onOutput(msg) {
    // To be extended by derived objects for specific behavior
    if (this.state !== 'playing') {
      if ((msg.search(/Invalid/) !== -1)
          || (msg.search(/You have no character/) !== -1)) {
        // Trap rejection messages from game engine at login or play
        this.logger.fatal({ error: stripAnsi(msg) }, 'invalid credentials')
        process.exit(2)
      }
    }
  }

  onSetPrompt(str) {
    // To be overriden by derived objects.
  }

  onLogin() {
    this.logger.debug('login')
    this.state = 'authenticated'
    this.socket.emit('input', 'play')
  }

  onLogout() {
    // To be extended by derived objects for specific behavior
    this.logger.debug('logout')
    this.state = 'connected'

    this.closeClient()

    if (this.selfQuitFlag) {
      this.logger.info('exit (requested by bot)')
      process.exit(0)
    } else {
      // The only other case for 'quit' to be emitted is when 
      // we kicked out from another session. If that other session
      // is a bot too, it may have loaded variables and we don't 
      // watch them currently, so it's possible any exit code and
      // save procedure has no effect. (FIXME)
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
      if (obj.options) {
        if (this.config[obj.label] && obj.options.indexOf(this.config[obj.label]) !== -1) {
          response[obj.name] = this.config[obj.label]
        } else {
          this.closeClient()
          this.logger.fatal('invalid character name')
          process.exit(2)
        }
      } else {
        response[obj.name] = this.config[obj.name]
      }
    })

    fn(response)
  }
}

module.exports = RoomJSClient
