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
    });
  }

  async run(message, args) {
    const isNumeric = (num) =>
      (typeof num === "number" ||
        (typeof num === "string" && num.trim() !== "")) &&
      !isNaN(num);

<<<<<<< HEAD
    let id;

    if (args.length === 0) {
      id = message.author.id;
=======
    if (args.length === 0) {
      const id = message.author.id;
      const embed = await getPoints(id);
      return message.channel.send(embed);
>>>>>>> dev
    }

    if (
      (isNumeric(args[0]) && args[0].length === 18) ||
      args[0].length === 22
    ) {
<<<<<<< HEAD
      id = args[0];
=======
      const id = args[0];
      const embed = await getPoints(id);
      return message.channel.send(embed);
>>>>>>> dev
    }

    const embed = await getPoints(args[0]);
    return message.channel.send(embed);
  }
};
