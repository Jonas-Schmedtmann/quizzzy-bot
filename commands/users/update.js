const Commando = require("discord.js-commando");
const toonAvatar = require("cartoon-avatar");
const axios = require("axios");

module.exports = class AddCommand extends Commando.Command {
  constructor(client) {
    super(client, {
      name: "update",
      group: "users",
      memberName: "update",
      description: "Update your profile",
      format: "update",
      throttling: { usages: 1, duration: 7200 },
    });
  }

  async run(message) {
    const { id: userId, tag } = message.author;

    const pfa = message.author.avatarURL()
      ? message.author.avatarURL()
      : toonAvatar.generate_avatar();

    const userRequest = await axios({
      method: "GET",
      url: `${process.env.BASE_URL}users/check/${userId}`,
    });

    if (!userRequest.data.data) {
      return await message.channel.send(`<@${userId}> does not exists.`);
    }

    await axios({
      method: "PATCH",
      url: `${process.env.BASE_URL}users/${userId}`,
      data: {
        tag,
        photo: pfa,
      },
    });

    await message.channel.send(`<@${userId}> has been updated.`);
  }
};
