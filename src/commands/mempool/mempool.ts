import { Command } from './../../types/command';
import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { getLastBlockAndHash } from '../../services/mempool';

const mempool: Command = {
  data: new SlashCommandBuilder().setName('mempool').setDescription('Ver bloque') as SlashCommandBuilder,
  execute: async (interaction: CommandInteraction) => {
    const lastBlock = await getLastBlockAndHash();

    if (!lastBlock) {
      interaction.reply('Error al obtener el último bloque');
      return;
    }

    console.info('Last block:', lastBlock);

    interaction.reply(`**Último bloque:** ${lastBlock.height}\n**Hash:** \`${lastBlock.hash}\``);
  },
};

export default mempool;
