# room.js-bot

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![dependencies Status](https://david-dm.org/omikhleia/room.js-bot/status.svg)](https://david-dm.org/omikhleia/room.js-bot)

RoomJS conversational bot

This is a bot template for Doughsay's [Room.JS](https://github.com/doughsay/room.js) MOO/MUD game engine.

The bot relies on [RiveScript](https://www.rivescript.com/docs/tutorial) for its conversational capabilities.

## Features

* The bot keeps some persistent knowledge about itself.
* The bot gathers persistent knowledge about the players.
* On [extended](https://github.com/Omikhleia/room.js-ng2-cli) game worlds, the bot has some knowledge regarding its environment (inventory, room, players).
* Beyond that, the conversational capabilities in this template are limited. It is up to you to add additional conversation rules.

## Prerequisites

The RoomJS bot requires **Node.js 6.0** or newer.

1. Clone the repository or download a ZIP archive.
2. Install **room.js** referring to its documentation, then launch the server.
3. Connect to the game and create a user account and character.
4. Move your character to the room you want the bot to be in, and 'quit'.

## Installation

Installation steps are straightforward:

1. `yarn install`
2. Use environment variables and/or create a `.env` file to customize the bot's configuration. Read **carefully** `.env.development` for examples and explanations.
3. `yarn start`

The bot should connect to your game and enter your world, in the room it previously left.

To kill the bot, hit Ctrl-C or send a SIGINT or SIGTERM signal to its process. These are intercepted to ensure a graceful exit and saving persistent data (see below).

## Configuration

### Variables

The first time, however, you will want to configure your bot. Hit Ctrl-C to abort the bot, as this will generate its save files. Two JSON files are generated in a folder corresponding to its character name and located below *bot-data/*

* **botvars.json**
* **uservars.json**

They are used to store persisting knowledge, respectively about the bot itself (i.e. "bot variables" in RiveScript terminology) and the users it previously discussed with (i.e. "user variables"). Obviously, when found, these files are also loaded on start-up, allowing the bot to remember previously acquired knowledge and states.

Edit the bot variables according to your needs. The 'name' and 'callcontext' properties are the only ones that cannot be changed. The former is overwritten at start-up with the actual character name; the latter is updated by dynamic scripts. All properties are assumed to be strings, that can be used afterwards in your RiveScript dialogs (with `<bot>` tags).

Normally, you shouldn't have to edit the user variables, unless you want to clear all past memories -- in that case, empty the JSON structure (i.e. set it to an empty object `{}`).

### Dialogs

Dialogs are described in RiveScript language.

* The main dialogs are defined using a set of *.rive* files in the *brain/* folder.
* You may additionnaly place a subfolder *brain/* under the bot's data folder (besides the JSON save files), to load additional rules specific to that peculiar bot. This may be used, for instance, to implement quest-specific dialogs, that only one bot would know.

In extension to RiveScript, in responses from the bot, square-bracketed strings are interpreted as raw in-game commands, while regular text is interpreted as utterances (i.e. "say" commands). This allows the bot to perform some actions, e.g. assuming the following rule is defined:

```
  + look [at] me
  - [look <id>] Heh!
```

Then if a player in the bot's room says "look me" or "look at me", it will trigger the bot to look at him/her and utter "Heh!"

Replies containing "ERR" are ignored.

The RiveScript files are watched for changes, so if you edit them on disk, the bot will be reloaded.
