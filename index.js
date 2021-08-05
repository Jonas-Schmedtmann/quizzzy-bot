// const fs = require("fs");
const path = require("path");

const Commando = require("discord.js-commando");
const axios = require("axios");
const dotenv = require("dotenv");

const postAnswer = require("./misc/postAnswer");
const postHTMLAnswer = require("./misc/postHTMLAnswer");

// Configuring dotenv
dotenv.config({
  path: "./config.env",
});

const getPrefix = async () => {
  const res = await axios({
    method: "GET",
    url: `${process.env.BASE_URL}settings/prefix`,
  });

  return res.data.data.prefix;
};

const client = new Commando.Client({
  owner: "667667162579861505",
  commandPrefix: "!",
});

require("discord-buttons")(client);

client.on("ready", async () => {
  console.log("===============================================");
  console.log(`Logged in as ${client.user.tag}!`);

  client.registry
    .registerGroups([
      ["questions", "Commands related to questions."],
      ["answers", "Commands related to answers."],
      ["users", "Commands related to users."],
      ["points", "Commands related to points."],
      ["settings", "Commands related to bot settings."],
    ])
    .registerCommandsIn(path.join(__dirname, "commands"));

  client.commandPrefix = await getPrefix();

  client.user.setActivity("quizzes", {
    type: "PLAYING",
  });
});

client.on("message", postAnswer.postAnswer);
client.on("message", postHTMLAnswer.postHTMLAnswer);
client.on("messageReactionAdd", postAnswer.checkReaction);

client.login(process.env.BOT_TOKEN);
