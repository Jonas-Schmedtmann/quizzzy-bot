const Discord = require("discord.js");
const generateQuestion = require("./generateQuestion");
const axios = require("axios");
const { MessageButton, MessageActionRow } = require("discord-buttons");

const getQuestionCount = async () => {
  const res = await axios({
    method: "GET",
    url: `${process.env.BASE_URL}settings/questioncount`,
  });

  return res.data.data.questionCount;
};

module.exports = async function (message, client) {
  const userId = message.author.id;
  const channelId = message.channel.id;

  const send = (msg) => message.channel.send(msg);

  class Question {
    constructor() {
      this.questions = [];
      this.replies = [];
      this.currentQuestion = 0;
    }

    setQuestions(questions) {
      this.questions.push(...questions);
    }

    askQuestion(prevReply = null) {
      const command = this.checkCommand(prevReply);
      // console.log(command);
      if (!command) {
        this.currentQuestion--;
        return this.askQuestion();
      }

      if (this.currentQuestion < this.questions.length) {
        this.replies.push(prevReply);

        if (prevReply) {
          send(
            `\`${prevReply}\`\n${this.questions[this.currentQuestion].question}`
          );
        } else {
          send(this.questions[this.currentQuestion].question);
        }
        console.log("command", command);
        if (command) this.currentQuestion++;
      } else {
        this.save();
      }
    }

    checkCommand(commandMsg) {
      if (commandMsg === null) return true;
      const curQuestion = this.questions[this.currentQuestion - 1];

      switch (commandMsg.trim().toLowerCase()) {
        case "cancel":
          this.message("ERROR", "Question creating has been cancelled!");
          this.reset();
          return true;

        case "skip":
          if (curQuestion.optional) {
            this.message("SUCCESS", "Question has been skipped!");
            return true;
          } else {
            this.message("ERROR", "Question is not optional!");
            return false;
          }
      }

      return true;
    }

    validateReply(reply) {
      const curQuestion = this.questions[this.currentQuestion - 1];

      if (!curQuestion.validate(reply)) {
        this.message("ERROR", curQuestion.validationError);
      }
    }

    onReplies(msg) {
      if (
        msg.channel.id === channelId &&
        msg.author.id === userId &&
        !msg.author.bot
      ) {
        const reply = msg.content.trim();
        question.askQuestion(reply);
      }
    }

    save() {
      console.log("ON SAVE 👇👇");
      console.log(this.replies);
      send("─".repeat(97));
      this.reset();
    }

    message(type, message) {
      const embed = new Discord.MessageEmbed()
        .setTitle(message)
        .setColor(type === "ERROR" ? "#ff3733" : "#00ffac");
      send(embed);
    }

    reset() {
      this.questions = [];
      this.replies = [];
      this.currentQuestion = 0;

      client.removeListener("message", question.onReplies);
      console.log("😳 RESET 😳");
    }
  }

  const question = new Question();

  question.setQuestions([
    {
      question: "Please enter the question you want to ask.",
      validate(reply) {
        return reply.length < 256;
      },
      validationError:
        "Titles is limited to 256 characters, if you want to add more you can add it in the description.",
    },
    {
      question: "(OPTIONAL) Please enter a description for the question.",
      optional: true,
      validate(reply) {
        return reply.length < 4096 - 150;
      },
      validationError:
        "Description is limited to 4096 characters, please reduce the text.",
    },
    {
      question:
        "Please enter the options for the question. Each should be on a different line and don't add the prefix. Example: **Correct** `option xyz` **Incorrect** `b) option xyz`",
      validate(reply) {
        const arr = reply.split("\n").map((opt) => opt.trim());

        return (
          arr.each((opt) => opt.length < 1024) &&
          arr.length >= 2 &&
          arr.length <= 12
        );
      },
      validationError:
        "Options should be more than or equal to 2 and less than or equal to 12",
    },
    {
      question:
        "Please enter the correct option. Just enter the correct letter. Example: A.",
      validate(reply) {
        return reply.trim().length === 1;
      },
      validationError: "Correct option should just be a letter, Example: A",
    },
    {
      question: "(OPTIONAL) Please add a image related to the question.",
      optional: true,
      validate(reply) {
        console.log("IMAGE: ", reply);
        return true;
      },
      validationError:
        "Description is limited to 4096 characters, please reduce the text.",
    },
    {
      question: "Please enter the explanation for this question.",
      validate(reply) {
        return reply.length < 4096;
      },
      validationError:
        "Explanation is limited to 4096 characters, please reduce the text.",
    },
  ]);

  question.askQuestion(null);
  client.on("message", question.onReplies);
};
