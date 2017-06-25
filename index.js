/* 2017 Omikhleia
 * License: MIT
 *
 * RoomJS bot main.
 */
const bunyan = require('bunyan')
const dotenv = require('dotenv')

const RoomJSBot = require('./src/room-js-bot')
const pkg = require('./package.json')

dotenv.config()
const config = {
  username: process.env.BOT_USER,
  password: process.env.BOT_PASSWORD,
  character: process.env.BOT_CHARACTER,
  address: process.env.ADDRESS || '127.0.0.1',
  port: process.env.PORT || '8888',
  inactivity: parseInt(process.env.BOT_INACTIVITY) || 60000,
  speed: parseInt(process.env.BOT_CPM) || 800,
  logLevel: process.env.LOG_LEVEL || 'info',
  appName: pkg.name
}

const { appName, logLevel } = config
const logger = bunyan.createLogger({ name: appName, level: logLevel })

if (config.username && config.password && config.character) {
  const client = new RoomJSBot(logger, config)
} else {
  logger.fatal('Credentials missing from environment configuration')
  process.exit(1)
}
