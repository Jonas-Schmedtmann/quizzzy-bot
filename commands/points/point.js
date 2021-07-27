const Commando = require("discord.js-commando");
const getPoints = require("../../misc/getPoints");

module.exports = class AddCommand extends Commando.Command {
  constructor(client) {
    super(client, {
      name: "points",
      aliases: ["point"],
      group: "points",
      memberName: "points",
      description: "Display's the points of a user.",
      argsType: "multiple",
      format: "points [user id]",
      throttling: { duration: 10800, usages: 2 },
    });
  }

  async run(message, args) {
    const isNumeric = (num) =>
      (typeof num === "number" ||
        (typeof num === "string" && num.trim() !== "")) &&
      !isNaN(num);

    if (args.length === 0) {
      const id = message.author.id;
      const embed = await getPoints(id);
      return message.channel.send(embed);
    }

    if (
      (isNumeric(args[0]) && args[0].length === 18) ||
      args[0].length === 22
    ) {
      const id = args[0];
      const embed = await getPoints(id);
      return message.channel.send(embed);
    }

    const embed = await getPoints(args[0]);
    return message.channel.send(embed);
  }
};
