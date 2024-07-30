import { BotEvent } from '../types/botEvents';
import { deployCommands } from '../deployCommands';
import { Client, Guild, Role } from 'discord.js';

const event: BotEvent = {
  name: 'ready',
  once: true,
  execute: async (_client: Client) => {
    await deployCommands(_client);

    console.log('\x1b[37m\x1b[42m%s\x1b[0m', 'Discord bot ready!');
  },
};

export default event;
