const userSpam = []
module.exports = {
    name: "p",
    description: "this is just test",
    prefix: false,
    async execute(bot, message) {

        let userFound = false
        for (const element of userSpam) {
            // const element = userSpam[i];
            if (element[message.author.username] != undefined) {
                element[message.author.username].counter++
                userFound = true
                break;
            }
        }

        if (!userFound) {
            userSpam.push({ [message.author.username]: { counter: 1 } })
        }

        for (const element of userSpam) {
            if (element[message.author.username].counter >= 7 && element[message.author.username].counter <= 8) {
                await message.reply(`<@${message.author.id}> Stop it cause it's kinda annoying`)
                await message.delete()
                break
            }
            
            if (element[message.author.username].counter >= 9 && element[message.author.username].counter <= 12) {
                await message.reply(`It's kinda really annoying to another user that got spammed too so pls stop it`)
                break
            }

            if (element[message.author.username].counter == 13 ) {
                await message.reply(`This is last warning before timeout`)
                break
            }

            if (element[message.author.username].counter == 14) {
                await message.reply(`3`)
                break
            }

            if (element[message.author.username].counter == 15) {
                await message.reply(`2`)
                break
            }

            if (element[message.author.username].counter == 16) {
                await message.reply(`1`)
                break
            }

            if (element[message.author.username].counter == 17) {
                await message.reply(`THAT'S IT!`)
                const member = message.guild.members.cache.get(message.author.id);
                if (member) {
                    await member.timeout(30 * 60 * 1000, 'Spamming'); // Timeout for 30 minutes
                    await message.reply(`<@${message.author.id}>  been timed out for spamming.`);
                    element[message.author.username].counter = 0
                }
            }

            message.reply("# NO PARK HERE!")
            break
        }
    }
}