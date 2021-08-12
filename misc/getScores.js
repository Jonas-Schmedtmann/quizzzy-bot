const Discord = require("discord.js");
const axios = require("axios");
const config = require("../config");

module.exports = async function showPoints(
  message,
  page,
  postChannelId = null
) {
  const getCount = await axios({
    method: "GET",
    url: `${process.env.BASE_URL}users/count`,
  });

  const count = getCount.data.data;

  const maxPage = Number.isInteger(count / 8)
    ? count / 8
    : Math.trunc(count / 8) + 1;

  if (page && maxPage < +page) {
    const errMsg = `\`${page}\` is not a valid page number! Enter a number between 1 - ${maxPage}.`;

    if (postChannelId) {
      return await message.client.channels.cache
        .get(postChannelId)
        .send(`<@${message.author.id}>, ${errMsg}`);
    }

    return message.reply(errMsg);
  }

  const res = await axios({
    method: "GET",
    url: `${
      process.env.BASE_URL
    }users?fields=tag,totalPoints&sort=-totalPoints${
      page ? `&page=${page}` : ""
    }`,
  });

  const data = res.data.data.data;

  data.forEach((user) => {
    const splitArr = user.tag.split("#");
    splitArr.splice(-1, 1);
    return (user.tag = splitArr.join("#"));
  });

  data.unshift({
    tag: "Test",
    totalPoints: 2,
  });

  const longestNameLengthNum = Math.max(...data.map((user) => user.tag.length));
  const longestNameLength = longestNameLengthNum > 7 ? longestNameLengthNum : 7;

  const strArr = data.map((user, i, arr) => {
    const pageNo = page || 1;

    let bottomStr = `╠${`═`.repeat(6)}╬${`═`.repeat(
      longestNameLength + 3
    )}╬${`═`.repeat(8)}╣`;

    let str = `║ ${`${8 * +pageNo - 8 + i}.`.padEnd(
      5
    )}║ @${`${user.tag}`.padEnd(
      longestNameLength,
      " "
    )} ║ ${`${user.totalPoints}`.padEnd(6)} ║`;

    if (i === 0) {
      const topStr = `╔${`═`.repeat(6)}╦${`═`.repeat(
        longestNameLength + 3
      )}╦${`═`.repeat(8)}╗`;

      str = `${topStr}
║ ${`Rank`.padEnd(5)}║ ${`Members`.padEnd(
        longestNameLength + 1,
        " "
      )} ║ ${`Points`.padEnd(6)} ║`;
    }

    if (i === arr.length - 1) {
      bottomStr = `╚${`═`.repeat(6)}╩${`═`.repeat(
        longestNameLength + 3
      )}╩${`═`.repeat(8)}╝`;
    }

    return `${str}
${bottomStr}`;
  });

  const embed = new Discord.MessageEmbed()
    .setTitle("Scores")
    .addFields({
      name: `${page ? `Page No: ${page}/${maxPage}` : `Page No: 1/${maxPage}`}`,
      value: `\`\`\`
${strArr.join("\n")}
\`\`\``,
    })
    .setColor(config.WARNING_COLOR);

  if (postChannelId) {
    return await message.client.channels.cache.get(postChannelId).send(embed);
  }

  message.channel.send(embed);
};
