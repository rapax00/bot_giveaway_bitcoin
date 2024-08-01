import { Command } from './../../types/command';
import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionsBitField,
  GuildMember,
  CommandInteractionOptionResolver,
} from 'discord.js';
import { resetParticipantsF } from '../sorteo/sorteo';

const resetParticipants: Command = {
  data: new SlashCommandBuilder()
    .setName('reiniciar-participantes')
    .setDescription('Ver participantes')
    .addStringOption((option) =>
      option.setName('id').setDescription('ID del sorteo').setRequired(true),
    ) as SlashCommandBuilder,
  execute: async (interaction: CommandInteraction) => {
    const giveawayId = (interaction.options as CommandInteractionOptionResolver).getString('id');

    // Only admins can use this command. TODO: creator of the giveaway
    if (!(interaction.member as GuildMember).permissions.has(PermissionsBitField.Flags.Administrator)) {
      interaction.reply({
        content: 'No tenés permisos para usar este comando',
        ephemeral: true,
      });

      return;
    }

    resetParticipantsF(giveawayId!);

    interaction.reply({
      content: `Participantes reiniciados`,
    });
  },
};

export default resetParticipants;
