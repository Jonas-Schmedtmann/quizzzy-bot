const Discord = require("discord.js");
const Commando = require("discord.js-commando");
const config = require("./../../config");

module.exports = class AddCommand extends Commando.Command {
  constructor(client) {
    super(client, {
      name: "help",
      group: "settings",
      memberName: "help",
      description: "Displays this message",
      argsType: "multiple",
      format: "help",
    });
  }

  async run(message) {
    const { client } = this;
    const prefix = client.commandPrefix;

    const commands = Array.from(client.registry.commands);

    const fields = commands
      .filter(([, command]) => {
        if (command.userPermissions === null) return true;
        if (message.member) {
          return message.member.hasPermission(command.userPermissions);
        } else {
          return false;
        }
      })
      .map(([, command]) => {
        return {
          name: [command.name, ...command.aliases]
            .map((c) => `${prefix}${c}`)
            .join(" | "),
          value: `${command.description}\n**Format:** \`${prefix}${command.format}\``,
        };
      });

    const embed = new Discord.MessageEmbed()
      .setTitle("Help")
      .addFields(...fields)
      .setColor(config.SUCCESS_COLOR);

    try {
      await message.author.send(embed);
      if (message.channel.type === "text") {
        message.reply("Sent you a DM containing the help message.");
      }
    } catch (err) {
      message.reply(
        "Something went wrong, make sure you don't have the bot blocked or DM's are not closed!"
      );
    }
  }
};
