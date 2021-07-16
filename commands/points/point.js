const Discord = require("discord.js");
const Commando = require("discord.js-commando");
const axios = require("axios");

const { MessageMenuOption, MessageMenu } = require("discord-buttons");
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
      guildOnly: true,
    });
  }

  async run(message, args) {
    const isNumeric = (num) =>
      (typeof num === "number" ||
        (typeof num === "string" && num.trim() !== "")) &&
      !isNaN(num);

    if (args.length === 0) {
      const options = [];

      const res = await axios({
        method: "GET",
        url: `${process.env.BASE_URL}users`,
      });

      const data = res.data.data.data;

      data.forEach((user) =>
        options.push(
          new MessageMenuOption()
            .setLabel(user.tag.split("#")[0])
            .setEmoji("🤍")
            .setValue(user.userId)
            .setDescription(`#${user.tag.split("#")[1]}`)
        )
      );

      const select = new MessageMenu()
        .setID("customid")
        .setPlaceholder("Click me! :D")
        .setMaxValues(1)
        .setMinValues(1)
        .addOptions(options);

      const menuMessage = await message.channel.send("Select user:", select);

      this.client.on("clickMenu", async (menu) => {
        const user = data.find((user) => user.userId === menu.values[0]);

        const splitTag = user.tag.split("#");
        splitTag.splice(-1, 1);

        const name = splitTag.join("#");

        const embed = new Discord.MessageEmbed()
          .setAuthor(`${name}`)
          .setTitle(`Total Points: ${user.totalPoints}`)
          .setThumbnail(user.photo)
          .setColor("#faa61a");

        menuMessage.delete();

        return message.channel.send(embed);
      });

      return;
    }

    if (
      (isNumeric(args[0]) && args[0].length === 18) ||
      args[0].length === 22
    ) {
      const embed = await getPoints(args[0]);
      return message.channel.send(embed);
    }
  }
};
