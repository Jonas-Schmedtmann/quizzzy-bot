const Commando = require("discord.js-commando");
const addQuestion = require("../../misc/addQuestion");
module.exports = class AddCommand extends Commando.Command {
  constructor(client) {
    super(client, {
      name: "question",
      aliases: ["que", "q"],
      group: "questions",
      memberName: "question",
      description: "Post the previous message as a new question",
      argsType: "multiple",
      userPermissions: ["MANAGE_MESSAGES"],
      format: "question",
      guildOnly: true,
    });
  }

  async run(message, args) {
    addQuestion(message, this.client);
  }
};
