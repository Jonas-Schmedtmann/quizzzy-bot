const Commando = require("discord.js-commando");
const addHTMLQuestion = require("../../misc/addHTMLQuestion");

module.exports = class AddCommand extends Commando.Command {
  constructor(client) {
    super(client, {
      name: "htmlquestion",
      aliases: ["htmlque", "hq"],
      group: "questions",
      memberName: "htmlquestion",
      description: "Post a new HTML question",
      argsType: "multiple",
      userPermissions: ["MANAGE_MESSAGES"],
      format: "htmlquestion",
      guildOnly: true,
    });
  }

  async run(message) {
    addHTMLQuestion(message, this.client);
  }
};
