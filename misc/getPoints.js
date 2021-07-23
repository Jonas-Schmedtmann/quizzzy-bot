const Discord = require("discord.js");
const axios = require("axios");
const config = require("../config");

module.exports = async function getScore(identity) {
  const id = identity.startsWith("<@!") ? identity.slice(3, -1) : identity;

  const usersReq = await axios({
    method: "GET",
    url: `${process.env.BASE_URL}users/?sort=-totalPoints&limit=500`,
  });
  const users = usersReq.data.data.data;

  const userIndex = users.findIndex((userObj) => userObj.userId === id);
  const user = users[userIndex];

  if (!user) {
    return `<@${id}> does not exists as they have not answered any questions yet, try with another user.`;
  }

  const splitTag = user.tag.split("#");
  splitTag.splice(-1, 1);

  const name = splitTag.join("#");

  const embed = new Discord.MessageEmbed()
    .setAuthor(`${name}`)
    .setTitle(`Total Points: ${user.totalPoints}`)
    .setDescription(`**Rank:** ${userIndex + 1}`)
    .setThumbnail(user.photo)
    .setColor(config.WARNING_COLOR);

  return embed;
};
