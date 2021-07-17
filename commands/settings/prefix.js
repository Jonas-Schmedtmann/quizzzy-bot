const Commando = require("discord.js-commando");
const axios = require("axios");

module.exports = class AddCommand extends Commando.Command {
  constructor(client) {
    super(client, {
      name: "prefix",
      group: "settings",
      memberName: "prefix",
      description: "Display/Change the bot command perfix",
      argsType: "multiple",
      userPermissions: ["MANAGE_MESSAGES"],
      format: "prefix [new prefix]",
      guildOnly: true,
    });
  }

  async run(message, args) {
    const { client } = this;
    const prefix = client.commandPrefix;

    if (message.content.trim() === `${prefix}prefix` && args.length === 0) {
      message.reply(
        `The command prefix is \`${prefix}\`. \n To run commands, use \`${prefix}command\` or \`${client.user.tag} command\`.`
      );
    }

    if (args.length !== 0 && args[0] === prefix) {
      message.reply(
        `The command prefix is to \`${args[0]}\`. \n To run commands, use \`${args[0]}command\` or \`${client.user.tag} command\`.`
      );
    }

    if (args.length !== 0 && args[0] !== prefix) {
      await axios({
        method: "PATCH",
        url: `${process.env.BASE_URL}settings/prefix`,
        data: {
          prefix: args[0],
        },
      });

      message.reply(
        `The command prefix is set to \`${args[0]}\`. \n To run commands, use \`${args[0]}command\` or \`${client.user.tag}\`command.`
      );
      client.commandPrefix = args[0];
    }
  }
};
