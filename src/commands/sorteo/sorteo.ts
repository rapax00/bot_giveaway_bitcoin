import { SlashCommandBuilder } from '@discordjs/builders';
import { ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder } from '@discordjs/builders';
import { Command } from '../../types/command';
import {
  CommandInteraction,
  GuildMember,
  CommandInteractionOptionResolver,
  TextInputStyle,
  ModalSubmitInteraction,
  ButtonStyle,
  ButtonInteraction,
  BaseGuildTextChannel,
} from 'discord.js';
import { getLastBlockAndHash } from '../../services/mempool';
import { _fdr, _rngIni } from '../../services/lottery';

interface Giveaway {
  [id: string]: GiveawayData;
}

interface GiveawayData {
  minimumRoleId: string | null;
  prize: string;
  block: string;
  winnersAmount: number;
  participantsIds: { [id: string]: null };
}

const giveawaysList: Giveaway = {};

const giveaway: Command = {
  data: new SlashCommandBuilder()
    .setName('sorteo')
    .setDescription('Creá un sorteo que utiliza el hash de un bloque de Bitcoin para determinar el ganador.')
    .addRoleOption((option) =>
      option.setName('role').setDescription('Rol requerido para participar.').setRequired(false),
    ) as SlashCommandBuilder,
  execute: async (_discordInteraction: CommandInteraction) => {
    // Create Giveaway
    const giveawayId: string = _discordInteraction.id;
    giveawaysList[giveawayId];

    // Check if the giveaway was created
    if (!giveawaysList && !giveawaysList[giveawayId]) {
      _discordInteraction.reply({
        content: 'Error al crear el sorteo',
        ephemeral: true,
      });

      return;
    }

    // Save the role id if it was set
    const roleOption = (_discordInteraction.options as CommandInteractionOptionResolver).getRole('role');
    giveawaysList[giveawayId]!.minimumRoleId = roleOption ? roleOption.id : null;

    modalMenu(_discordInteraction);
  },
};

/**
 * Create and show the modal menu to set the giveaway
 *
 * @param _discordInteraction Discord interaction for show the modal
 * @returns
 */
async function modalMenu(_discordInteraction: CommandInteraction) {
  try {
    const modal = new ModalBuilder()
      .setCustomId(`giveaway-modal-id:${_discordInteraction.id}`)
      .setTitle(`Creá el sorteo - ID: ${_discordInteraction.id}`);

    // Crete text input component
    const prizeTextInput = new TextInputBuilder()
      .setCustomId('prize-text-input')
      .setLabel('Premio/s.')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(150)
      .setPlaceholder('2100 satoshis');
    const blockTextInput = new TextInputBuilder()
      .setCustomId('block-text-input')
      .setLabel('Bloque en el cual se sortea')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(150)
      .setPlaceholder('Solo numeros sin punto ni coma. (ej: 840123)');
    const winnersTextInput = new TextInputBuilder()
      .setCustomId('winners-text-input')
      .setLabel('Cantidad de ganadores')
      .setPlaceholder('Un número. (ej: 3, 10, 115)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(3);

    // Create text input row
    const inputRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
      prizeTextInput,
      blockTextInput,
      winnersTextInput,
    );

    modal.addComponents(inputRow);

    await _discordInteraction.showModal(modal);
  } catch (error) {
    await _discordInteraction.reply({
      content: 'Error al generar el modal',
      ephemeral: true,
    });

    return;
  }
}

/**
 * Setup and send the giveaway message
 *
 * @param _giveawayId Giveaway id for save the data
 * @param _discordInteraction Discord interaction for get the data and reply
 * @returns
 */
export async function createGiveway(_giveawayId: string, _discordInteraction: ModalSubmitInteraction) {
  try {
    const giveaway: GiveawayData = giveawaysList[_giveawayId]!;

    // Check if the giveaway exists
    if (!giveaway) {
      _discordInteraction.reply({
        content: 'Error al crear el sorteo',
        ephemeral: true,
      });

      return;
    }

    const block: string = _discordInteraction.fields.fields.get('block-text-input')?.value!;
    const prize: string = _discordInteraction.fields.fields.get('prize-text-input')?.value!;
    const winnersAmount: number = parseInt(_discordInteraction.fields.fields.get('winners-text-input')?.value!);

    // Save the giveaway data
    giveaway.block = block;
    giveaway.prize = prize;
    giveaway.winnersAmount = winnersAmount;

    const button = new ButtonBuilder()
      .setCustomId(`giveaway-button-id:${_giveawayId}`)
      .setLabel('Participar')
      .setStyle(ButtonStyle.Primary);

    const rowButton = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    // Send message with button to participate
    _discordInteraction.reply({
      content:
        '# Sorteo\n' +
        '> ID: ' +
        _giveawayId +
        '\n**Premio:** ' +
        prize +
        '\n**Bloque:** ' +
        block +
        '\n**Ganadores:** ' +
        winnersAmount,
      components: [rowButton],
    });

    startGiveaway(_giveawayId, _discordInteraction);
  } catch (error) {
    console.error('Error al crear el sorteo', error);

    return;
  }
}

/**
 * Start listening the mempool for the giveaway block and send the winner finally
 * @param _giveawayId
 * @param _discordInteraction
 * @returns
 */
async function startGiveaway(_giveawayId: string, _discordInteraction: ModalSubmitInteraction) {
  try {
    // Get the giveaway data
    const giveaway: GiveawayData = giveawaysList[_giveawayId]!;

    if (!giveaway) {
      _discordInteraction.reply({
        content: 'Error al iniciar el sorteo',
        ephemeral: true,
      });

      return;
    }

    // Get channel
    const channel: BaseGuildTextChannel = (await _discordInteraction.channel?.fetch()) as BaseGuildTextChannel; // posible error

    // Start the interval of mempool checking
    const intervalId = setInterval(async () => {
      const blockInfo = await getLastBlockAndHash();
      if (!blockInfo) return;
      const { height, hash } = blockInfo;

      if (height >= parseInt(giveaway.block)) {
        clearInterval(intervalId);

        if (giveaway.winnersAmount === 1) {
          const winner = giveaway.participantsIds[_fdr(_rngIni(hash), Object.keys(giveaway.participantsIds).length)];

          // Send the winners list
          channel.send({
            content:
              '##El ganador de **' +
              giveaway.prize +
              +'** es:' +
              '\n# :tada: <@' +
              winner +
              '> :tada:' +
              '> ID del sorteo: ' +
              _giveawayId,
          });
        }
        // TODO: more than one winner
      }
    }, 30 * 1000); // 30 seconds
  } catch (error) {
    console.error('Error al iniciar el sorteo', error);

    return;
  }
}

/**
 * Add the user to the giveaway participants
 *
 * @param _giveawayId Giveaway id for save the data
 * @param _discordInteraction Discord interaction for get the data and reply
 * @returns
 */
export async function addParticipant(_giveawayId: string, _discordInteraction: ButtonInteraction) {
  try {
    const giveaway: GiveawayData = giveawaysList[_giveawayId]!;

    // Check if the giveaway exists
    if (!giveaway) {
      _discordInteraction.reply({
        content: 'Error al crear el sorteo',
        ephemeral: true,
      });

      return;
    }

    if (giveaway.minimumRoleId) {
      // Verify if the user has the required role
      if (!(_discordInteraction.member as GuildMember).roles.cache.has(giveaway.minimumRoleId)) {
        _discordInteraction.reply({
          content: 'No tenés el rol necesario para participar',
          ephemeral: true,
        });

        return;
      }
    }

    // Verify if the user is already in the participants
    if (giveaway.participantsIds[_discordInteraction.user.id] !== undefined) {
      _discordInteraction.reply({
        content: ':white_check_mark: Ya estás anotado en el sorteo',
        ephemeral: true,
      });

      return;
    }

    // Add the user to the participants
    giveaway.participantsIds[_discordInteraction.user.id];

    _discordInteraction.reply({
      content: 'Te anotaste en el sorteo :partying_face:',
      ephemeral: true,
    });
  } catch (error) {
    console.error('Error al añadir participante', error);

    return;
  }
}

/**
 * Get the giveaways list
 * @returns
 */
export function getGiveaways() {
  return Object.keys(giveawaysList);
}

/**
 * Get the participants ids of a giveaway
 * @param _giveawayId ID of the giveaway
 * @returns List of participants ids or null
 */
export function getParticipantsIds(_giveawayId: string): string[] | null {
  const giveaway = giveawaysList[_giveawayId];

  if (!giveaway) {
    return null;
  }

  return Object.keys(giveaway.participantsIds);
}

/**
 * Reset the participants of a giveaway
 * @param _giveawayId ID of the giveaway
 * @returns True if the participants were reset
 */
export function resetParticipantsF(_giveawayId: string): boolean {
  const giveaway = giveawaysList[_giveawayId];

  if (!giveaway) {
    return false;
  }

  Object.keys(giveaway.participantsIds).forEach((key) => {
    delete giveaway.participantsIds[key];
  });

  return true;
}

export default giveaway;
