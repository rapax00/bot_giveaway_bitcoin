import { Command } from './../../types/command';
import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { getParticipantsIds } from '../sorteo/sorteo';

const getParticipants: Command = {
  data: new SlashCommandBuilder()
    .setName('ver-participantes')
    .setDescription('Ver participantes') as SlashCommandBuilder,
  execute: async (interaction: CommandInteraction) => {
    const participants: string[] = await getParticipantsIds();

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
