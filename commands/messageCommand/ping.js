module.exports = {
    name: "ping",
    description: "to check all of the ping",
    prefix: true,
    async execute(bot, message) {
        message.channel.send("My ping is: `" + bot.ws.ping + "`ms")
    }
}