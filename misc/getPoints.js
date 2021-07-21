const Discord = require("discord.js");
const axios = require("axios");
const config = require("../config");

module.exports = async function getScore(identity) {
  const id = identity.startsWith("<@!") ? identity.slice(3, -1) : identity;

  const userExists = await axios({
    method: "GET",
    url: `${process.env.BASE_URL}users/check/${id}`,
  });

  if (userExists.data.data) {
    const res = await axios({
      method: "GET",
      url: `${process.env.BASE_URL}users/${id}`,
    });

    const data = res.data.data.data;

    const splitTag = data.tag.split("#");
    splitTag.splice(-1, 1);

    const name = splitTag.join("#");

    const embed = new Discord.MessageEmbed()
      .setAuthor(`${name}`)
      .setTitle(`Total Points: ${data.totalPoints}`)
      .setThumbnail(data.photo)
      .setColor(config.WARNING_COLOR);

    return embed;
  } else {
    return `<@!${id}> does not exsits as they have not answered any questions yet, try with another user.`;
  }
};
