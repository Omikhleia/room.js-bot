const ansiToText = require('ansi_up').ansi_to_text

class ConversationHandler {
  constructor (bot) {
    this.bot = bot;
    this.patterns = [
      { expr: /^(.*) enters\./i, 
        action: this.onEnter.bind(this) },
      { expr: /^(.*) says "(.*)"/i,
        action: this.onSay.bind(this) },
    ]
  }

  process (msg, fn) {
    this.patterns.some(pattern => {
      let expr = pattern.expr
      let result = expr.exec(msg)
      if (result) {
        pattern.action(result, fn)
        return true
      }
      return false
    })
  }
  
  onEnter(arg, fn) {
    fn(`say Greetings ${arg[1]}.`)
  }
  
  onSay(arg, fn) {
    const user = arg[1]
    const message = ansiToText(arg[2])
    var reply = this.bot.reply(user, message)

    if (reply.search(/ERR/) === -1) {
      //Split commands and utterance, respecting order
      let splits = reply.match(/\[[^\]]*\]|[^[\]]+/g)
      if (splits) {
        splits.forEach(str => {
          if (str.lastIndexOf('[') !== -1) {
            let command = str.replace('[', '').replace(']', '').trim()
            if (command.length ) {
              fn(command)
            }
          } else {
            // Utterance
            let utterance = str.trim()
            if (utterance.length) {
              fn(`say ${utterance}`)
            }
          }
        })
      }
    }
  }
}

module.exports = ConversationHandler
