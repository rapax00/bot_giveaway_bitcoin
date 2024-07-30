import { Interaction } from 'discord.js';
import { BotEvent } from '../types/botEvents';
import { ExtendedClient } from '../types/discordClient';
import { addParticipant, createGiveway } from '../commands/sorteo/sorteo';

const event: BotEvent = {
  name: 'interactionCreate',
  once: false,
  execute: async (interaction: Interaction) => {
    const client = interaction.client as ExtendedClient;

    /////////////////////
    /// Slash Command ///
    /////////////////////
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName); // Get command from collection
      if (!command) return; // If command doesn't exist, return
      command.execute(interaction); // If command exist, execute it
    }

    //////////////
    /// Button ///
    //////////////
    else if (interaction.isButton()) {
      if (interaction.customId === 'sorteo-button') {
        addParticipant(interaction);
      }
    }

    ////////////////////
    /// Modal Submit ///
    ////////////////////
    else if (interaction.isModalSubmit()) {
      if (interaction.customId === 'sorteo-modal') {
        await createGiveway(interaction);
      }
    }
  },
};

export default event;
