import { ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder } from '@discordjs/builders';
import { Command } from '../../types/command';
import {
  SlashCommandBuilder,
  CommandInteraction,
  GuildMember,
  PermissionsBitField,
  CommandInteractionOptionResolver,
  TextInputStyle,
  ModalSubmitInteraction,
  ButtonStyle,
  ButtonInteraction,
} from 'discord.js';
import { halve } from '../../services/lottery';
import { getLastBlockAndHash } from '../../services/mempool';

interface Participant {
  [id: string]: GuildMember;
}

const participants: Participant = {};

let discordRoleId: string;

const sorteo: Command = {
  data: new SlashCommandBuilder()
    .setName('sorteo')
    .setDescription('Sorteo')
    .addRoleOption((option) =>
      option.setName('role').setDescription('Rol que minimo').setRequired(true),
    ) as SlashCommandBuilder,
  execute: async (_discordInteraction: CommandInteraction) => {
    // Only admins can use this command
    if (!(_discordInteraction.member as GuildMember).permissions.has(PermissionsBitField.Flags.Administrator)) {
      _discordInteraction.reply({
        content: 'No tenés permisos para usar este comando',
        ephemeral: true,
      });

      return;
    }

    discordRoleId = (_discordInteraction.options as CommandInteractionOptionResolver).getRole('role', true).id;

    modalMenu(_discordInteraction);
  },
};

async function modalMenu(_discordInteraction: CommandInteraction) {
  try {
    const modal = new ModalBuilder().setCustomId('sorteo-modal').setTitle('Creá el sorteo');

    // Crete text input component
    const premioTextInput = new TextInputBuilder()
      .setCustomId('premio-text-input')
      .setLabel('Premio')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(150)
      .setPlaceholder('Un abrazo');
    const bloqueTextInput = new TextInputBuilder()
      .setCustomId('bloque-text-input')
      .setLabel('Bloque de sorteo')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(150)
      .setPlaceholder('Solo numeros sin punto ni coma. (ej: 840123)');
    const winnersTextInput = new TextInputBuilder()
      .setCustomId('winners-text-input')
      .setLabel('Cantidad de ganadores')
      .setPlaceholder('Solo un numero, puede ser de hasta 3 cifras. (ej: 3, 10, 115)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(3);

    // Create text input row
    const premioTextInputRow = new ActionRowBuilder<TextInputBuilder>().addComponents(premioTextInput);
    const bloqueTextInputRow = new ActionRowBuilder<TextInputBuilder>().addComponents(bloqueTextInput);
    const winnersTextInputRow = new ActionRowBuilder<TextInputBuilder>().addComponents(winnersTextInput);

    modal.addComponents(premioTextInputRow, bloqueTextInputRow, winnersTextInputRow);

    await _discordInteraction.showModal(modal);
  } catch (error) {
    console.error('Error al generar el modal', error);

    return;
  }
}

export async function createGiveway(_discordInteraction: ModalSubmitInteraction) {
  try {
    const prize: string = _discordInteraction.fields.fields.get('premio-text-input')?.value!;
    const block: string = _discordInteraction.fields.fields.get('bloque-text-input')?.value!;
    const winners: number = parseInt(_discordInteraction.fields.fields.get('winners-text-input')?.value!);

    const button = new ButtonBuilder()
      .setCustomId(`sorteo-button`)
      .setLabel('Participar')
      .setStyle(ButtonStyle.Primary);

    const rowButton = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    // Send message with button to participate
    _discordInteraction.reply({
      content: '# Sorteo\n**Premio:** ' + prize + '\n**Bloque:** ' + block + '\n**Ganadores:** ' + winners,
      components: [rowButton],
    });

    startGiveaway(block, winners, _discordInteraction);
  } catch (error) {
    console.error('Error al crear el sorteo', error);

    return;
  }
}

export async function addParticipant(_discordInteraction: ButtonInteraction) {
  try {
    // Verify if the user has the required role
    if (!_discordInteraction.member?.roles.cache.has(discordRoleId)) {
      _discordInteraction.reply({
        content: 'No tenés el rol necesario para participar',
        ephemeral: true,
      });

      return;
    }

    // Verify if the user is already in the participants
    if (participants[_discordInteraction.user.id] !== undefined) {
      _discordInteraction.reply({
        content: ':white_check_mark: Ya estás anotado en el sorteo',
        ephemeral: true,
      });

      return;
    }

    // Add the user to the participants
    participants[_discordInteraction.user.id] = _discordInteraction.member! as GuildMember;

    _discordInteraction.reply({
      content: 'Te anotaste en el sorteo :partying_face:',
      ephemeral: true,
    });
  } catch (error) {
    console.error('Error al anotar al participante', error);

    return;
  }
}

async function startGiveaway(targetBlock: string, winnersCount: number, _discordInteraction: ModalSubmitInteraction) {
  console.log('makeGiveaway', targetBlock, winnersCount); // debug

  const channel: any = await _discordInteraction.channel?.fetch();

  const intervalId = setInterval(async () => {
    const blockInfo = await getLastBlockAndHash();
    console.log('blockInfo', blockInfo); // debug
    if (!blockInfo) return;

    const { height, hash } = blockInfo;
    if (height >= parseInt(targetBlock)) {
      clearInterval(intervalId);

      const players: { [id: string]: number } = {};
      Object.keys(participants).forEach((id) => {
        players[id] = 1; // Asignar un peso igual a cada participante
      });

      let winners = players;
      while (Object.keys(winners).length > winnersCount) {
        const result = halve(hash, winners);
        winners = result.winners;
      }

      const winnerIds = Object.keys(winners);
      const winnersList = winnerIds.map((id) => participants[id]);

      // Send the winners list
      channel.send({
        content: `:tada: Los ganadores del sorteo son:\n${winnersList.map((winner) => `<@${winner.id}>`).join('\n')}`,
      });
    }
  }, 60000); // Verificar cada minuto
}

export default sorteo;
