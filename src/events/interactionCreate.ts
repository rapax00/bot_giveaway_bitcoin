import { Interaction } from 'discord.js';
import { BotEvent } from '../types/botEvents';
import { ExtendedClient } from '../types/discordClient';
import giveaway, { addParticipant, createGiveway } from '../commands/sorteo/sorteo';

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

    ////////////////////
    /// Modal Submit ///
    ////////////////////
    else if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('giveaway-modal-id:')) {
        const giveawayId: string = interaction.customId.split(':')[1]!;
        await createGiveway(giveawayId, interaction);
      }
    }

    //////////////
    /// Button ///
    //////////////
    else if (interaction.isButton()) {
      if (interaction.customId.startsWith('giveaway-button-id:')) {
        const giveawayId: string = interaction.customId.split(':')[1]!;
        addParticipant(giveawayId, interaction);
      }
    }
  },
};

export default event;
