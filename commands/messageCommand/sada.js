module.exports = {
    name: "sada",
    description: "this is just test",
    prefix: true,
    async execute(bot, message) {
        if(message.author.id == 722295696903897119) {
            message.reply("Hmm?")
        } else message.channel.send("Hi, i'm sada!")
    }
}