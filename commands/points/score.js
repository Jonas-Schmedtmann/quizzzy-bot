const Commando = require("discord.js-commando");
const getScores = require("./../../misc/getScores");

module.exports = class AddCommand extends Commando.Command {
  constructor(client) {
    super(client, {
      name: "scores",
      aliases: ["score"],
      group: "points",
      memberName: "scores",
      description: "Display's the scoreboard from highest to lowest.",
      argsType: "multiple",
      userPermissions: ["MANAGE_MESSAGES"],
      format: "scores [page no]",
      guildOnly: true,
    });
  }

  async run(message, args) {
    const isNumeric = (num) =>
      (typeof num === "number" ||
        (typeof num === "string" && num.trim() !== "")) &&
      !isNaN(num);

    if ((isNumeric(args[0]) && args[0].length < 3) || args.length === 0) {
      return getScores(message, args[0]);
    }
  }
};
