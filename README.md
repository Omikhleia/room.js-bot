# room.js-bot
RoomJS conversational bot

**Alpha version - Work in Progress**

This is an _experimental_ bot for Doughsay's [Room.JS](https://github.com/doughsay/room.js) MOO/MUD game engine.

The bot relies on [RiveScript](https://www.rivescript.com/docs/tutorial) for its conversational capabilities.

## Prerequisites

The RoomJS bot requires **Node.js 6.0** or newer.

1. Clone the repository or download a ZIP archive.
2. Install **room.js** referring to its documentation, then launch the server
3. Connect to the game and create a user account and character
4. Move your character to the room you want the bot to be in, and 'quit'

## Installation

Installation steps are straightforward:

1. `yarn install`
2. User environment variables and/or create a `.env` file to customize the bot's configuration. Read carefully `.env.development` for examples and explanations.
3. `yarn start`

The bot should connect to your game and enter your world, in the room it previously left.

To kill the bot, hit Ctrl-C or send a SIGINT or SIGTERM signal to its process. These are intercepted to ensure a grateful exit and saving persistent data (see below).

## Configuration

### Variables

The first time, however, you will want to configure your bot. Hit Ctrl-C to abort the bot, as this will generate its save files. Two JSON files are generated in a folder corresponding to its account name and located below *bot-data/*

* **botvars.json**
* **uservars.json**

They are used to store persisting knowledge, respectively about the bot itself (i.e. "bot variables" in RiveScript terminology) and the users it previously discussed with (i.e. "user variables"). Obviously, when found, these files are also loaded on start-up, allowing the bot to remember previously acquired knowledge and states.

Edit the bot variables according to your needs. The name property is the only one that cannot be changed, as it is overwritten at start-up with the character name. All other properties are assumed to be strings, that can be used afterwards in your RiveScript dialogs (with `<bot>` tags).

Normally, you shouldn't have to edit the user variables, unless you want to clear all past memories -- in that case, empty the JSON structure (i.e. set it to an empty object `{}`).

### Dialogs

Dialogs are described in RiverScript language.

* The main dialogs are defined using a set of *.rive* files in the *brain/* folder.
* You may additionnaly place a subfolder *brain/* under the bot's data folder (besides the JSON save file), to load additional rules specific to that bot. This may be used, for instance, to implement quest-specific dialogs that only one bot would know.

In extension to RiveScript, in responses from the bot, square-bracketed strings are interpreted as raw in-game commands, while regular text is interpreted as utterances (i.e. "say" commands). This allows the bot to perform some actions, e.g. assuming the following rule is defined:

```
  + look [at] me
  - [look <id>] Heh!
```

Then if a player in the bot's room says "look me" or "look at me", it will trigger the bot to look at him/her and then to utter "Heh!"

## License : MIT

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

