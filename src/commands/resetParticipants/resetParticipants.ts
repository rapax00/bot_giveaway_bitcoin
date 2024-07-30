import { Command } from './../../types/command';
import { SlashCommandBuilder, CommandInteraction, PermissionsBitField, GuildMember } from 'discord.js';
import { resetParticipantsF } from '../sorteo/sorteo';

const resetParticipants: Command = {
  data: new SlashCommandBuilder()
    .setName('reiniciar-participantes')
    .setDescription('Ver participantes') as SlashCommandBuilder,
  execute: async (interaction: CommandInteraction) => {
    // Only admins can use this command
    if (!(interaction.member as GuildMember).permissions.has(PermissionsBitField.Flags.Administrator)) {
      interaction.reply({
        content: 'No tenés permisos para usar este comando',
        ephemeral: true,
      });

      return;
    }

    resetParticipantsF();

    interaction.reply({
      content: `Participantes reiniciados`,
    });
  },
};

export default resetParticipants;
