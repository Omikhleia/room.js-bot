const bunyan = require('bunyan')
const dotenv = require('dotenv')

const RoomJSBot = require('./lib/room-js-bot')

dotenv.config()
const pkg = require('./package.json')
const config = {
  username: process.env.BOT_USER,
  password: process.env.BOT_PASSWORD,
  character: process.env.BOT_CHARACTER,
  address: process.env.ADDRESS || '127.0.0.1',
  port: process.env.PORT || '8888',
  logLevel: process.env.LOG_LEVEL || 'info',
  appName: pkg.name
}

if (config.username && config.password) {
  const { appName, logLevel } = config
  const logger = bunyan.createLogger({ name: appName, level: logLevel })
  const client = new RoomJSBot(logger, config)
} else {
  console.log("Credentials missing from environment configuration");
  process.exit(1);
}
