const Discord = require("discord.js");
const generateQuestion = require("./generateQuestion");
const axios = require("axios");
const { MessageButton, MessageActionRow } = require("discord-buttons");
const config = require("../config");

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

  let post;

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

    async askQuestion(prevMessage = null) {
      let reply = prevMessage !== null ? prevMessage.content.trim() : null;
      const command = this.checkCommand(reply);
      if (command === "CANCEL") return;

      const validate = this.validateReply(prevMessage);

      if (!command || !validate) {
        this.currentQuestion--;
        return this.askQuestion();
      }

      if (this.currentQuestion < this.questions.length) {
        const curQuestion = this.questions[this.currentQuestion];

        if (this.questions[this.currentQuestion - 1]?.type === "IMAGE") {
          const attachments = prevMessage?.attachments?.values();
          if (!attachments) {
            reply = "skip";
          } else {
            reply = Array.from(attachments)[0]?.url || "skip";
          }
        }

        send(`**${curQuestion.question}**`);
        if (reply) this.replies.push(reply);

        if (command && validate) this.currentQuestion++;
      } else {
        this.replies.push(reply);
        await this.save();
      }
    }

    checkCommand(commandMsg) {
      if (commandMsg === null) return true;
      const curQuestion = this.questions[this.currentQuestion - 1];

      switch (commandMsg.trim().toLowerCase()) {
        case "cancel":
          this.message("ERROR", "Question creating has been cancelled!");
          this.reset();
          return "CANCEL";

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

    validateReply(replyMessage) {
      const reply = replyMessage !== null ? replyMessage.content.trim() : null;

      if (reply === null) return true;
      const curQuestion = this.questions[this.currentQuestion - 1];

      if (!curQuestion.validate.call(this, reply, replyMessage)) {
        this.message("ERROR", curQuestion.validationError);
        return false;
      }
      return true;
    }

    onReplies(msg) {
      if (
        msg.channel.id === channelId &&
        msg.author.id === userId &&
        !msg.author.bot
      ) {
        // const reply = msg.content.trim();
        question.askQuestion(msg);
      }
    }

    async confirmQuestion(
      title,
      description,
      options,
      questionNo,
      imageURL,
      message
    ) {
      const [questionEmbed, answerEmbed] = await generateQuestion(
        title,
        description,
        options,
        questionNo,
        imageURL,
        message
      );

      this.questionEmbed = questionEmbed;
      this.answerEmbed = answerEmbed;

      const button = new MessageButton()
        .setStyle("green")
        .setLabel("Add Question")
        .setEmoji(process.env.CORRECT_EMOJI_ID)
        .setID("add_question");

      const button2 = new MessageButton()
        .setStyle("red")
        .setLabel("Cancel")
        .setEmoji(process.env.WRONG_EMOJI_ID)
        .setID("remove_question");

      const row = new MessageActionRow().addComponents(button, button2);
      // Confirm Message
      this.confirmAnswerMessage = await message.channel.send(
        "👇 This is how the answer of the last question will look like, are u happy with it?",
        answerEmbed
      );
      this.confirmMessage = await message.channel.send(
        "👇 This is how the question will look, are u happy with it?",
        questionEmbed
      );
      this.buttonsMessage = await message.channel.send("﹏", row);
    }

    async save() {
      let [
        title,
        description,
        optionsString,
        answerOption,
        imageURL,
        explanation,
      ] = [...this.replies];

      if (description === "skip") description = null;
      if (imageURL === "skip") imageURL = null;

      const options = optionsString
        .split("\n")
        .map((opt) => opt.trim())
        .filter((option) => option !== "");

      post = {
        question: title,
        options: options,
        correctOption: answerOption,
        userId: userId,
        questionNo: (await getQuestionCount()) + 1,
        explanation: explanation,
      };

      if (imageURL) post.image = imageURL;
      if (description) post.description = description;

      const confirmDescription = post?.description || "";
      const image = post?.image || null;

      await this.confirmQuestion(
        post.question,
        confirmDescription,
        post.options,
        post.questionNo,
        image,
        message
      );

      message.client.on(
        "clickButton",
        this.confirmQuestionButtonHandler.bind(this)
      );
    }

    async confirmQuestionButtonHandler({ id, message, clicker, reply }) {
      const { user, member } = clicker;
      if (
        !user.bot &&
        user.id === userId &&
        member.hasPermission("MANAGE_ROLES")
      ) {
        const deleteMessages = async (msg, sec = 3) => {
          const infoMessage = await reply.send(msg);
          await this.confirmAnswerMessage.delete();
          await this.confirmMessage.delete();
          await this.buttonsMessage.delete();

          setTimeout(() => {
            infoMessage.delete();
          }, sec * 1000);
        };

        // Add the question
        if (id === "add_question") {
          await axios({
            method: "POST",
            url: `${process.env.BASE_URL}questions`,
            data: post,
          });

          // Show final message
          await message.client.channels.cache
            .get(process.env.QUESTION_CHANNEL_ID)
            .send(`<@&${process.env.TRIVIA_ROLE_ID}>`, this.answerEmbed);
          await message.client.channels.cache
            .get(process.env.QUESTION_CHANNEL_ID)
            .send(this.questionEmbed);

          await deleteMessages("https://i.stack.imgur.com/KZiub.gif");

          send(
            new Discord.MessageEmbed()
              .setTitle(
                `Question has been successfully posted in #${
                  message.client.channels.cache.get(
                    process.env.QUESTION_CHANNEL_ID
                  ).name
                }`
              )
              .setColor(config.SUCCESS_COLOR)
          );
        }

        // Delete the messages
        if (id === "remove_question") {
          await deleteMessages("https://i.stack.imgur.com/dB8Ny.gif");
          this.message("ERROR", "Question was removed.");
        }
        this.reset();
      }
    }

    message(type, msg) {
      const emoji = message.client.emojis.cache.get(
        type === "ERROR"
          ? process.env.WRONG_EMOJI_ID
          : process.env.CORRECT_EMOJI_ID
      );

      const embed = new Discord.MessageEmbed()
        .setTitle(`${emoji}  ${msg}`)
        .setColor(type === "ERROR" ? config.ERROR_COLOR : config.SUCCESS_COLOR);
      send(embed);
    }

    reset() {
      this.questions = [];
      this.replies = [];
      this.currentQuestion = 0;

      client.removeListener("message", question.onReplies);
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
        "Please enter the options for the question. Each should be on a different line and don't add the prefix. Example: \nCorrect: `option xyz` \nIncorrect: `b) option xyz`",
      validate(reply) {
        const arr = reply.split("\n").map((opt) => opt.trim());
        return (
          arr.every((opt) => opt.length < 1024) &&
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
        // prettier-ignore
        const alphabets = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k","l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
        return [...alphabets]
          .splice(0, this.replies[this.replies.length - 1].split("\n").length)
          .includes(reply.trim().toLowerCase());
      },
      validationError:
        "Correct option should just be a letter, Example: A. Also it should be a possible option.",
    },
    {
      question: "(OPTIONAL) Please add a image related to the question.",
      type: "IMAGE",
      optional: true,
      validate(reply, replyMessage) {
        const image = Array.from(replyMessage.attachments.values())[0];
        if (image?.url || replyMessage.content === "skip" || reply === null)
          return true;
        return false;
      },
      validationError: "No image was posted, please add an image.",
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

  const emoji = await message.client.emojis.cache.get(
    process.env.CORRECT_EMOJI_ID
  );
  const embed = new Discord.MessageEmbed()
    .setTitle(
      `${emoji}  Answer the below questions to set the question for trivia. You can type \`cancel\` at any time to cancel question creation and you can type \`skip\` to skip optional questions.`
    )
    .setColor(config.WARNING_COLOR);

  await send(embed);

  question.askQuestion(null);
  client.on("message", question.onReplies);
};
