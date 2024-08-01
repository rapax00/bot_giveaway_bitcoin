import { Command } from './../../types/command';
import { SlashCommandBuilder, CommandInteraction, CommandInteractionOptionResolver } from 'discord.js';
import { getParticipantsIds } from '../sorteo/sorteo';

const getParticipants: Command = {
  data: new SlashCommandBuilder()
    .setName('ver-participantes')
    .setDescription('Ver participantes')
    .addStringOption((option) =>
      option.setName('id').setDescription('ID del sorteo').setRequired(true),
    ) as SlashCommandBuilder,
  execute: async (interaction: CommandInteraction) => {
    const giveawayId = (interaction.options as CommandInteractionOptionResolver).getString('id');

    const participants: string[] | null = getParticipantsIds(giveawayId!);

    if (!participants) {
      interaction.reply('No hay participantes');
      return;
    }

    interaction.reply({
      content: `# Participantes:\n${participants.map((id) => `<@${id}>`).join('\n')}`,
    });
  },
};

export default getParticipants;
