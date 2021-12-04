let _terrainRandomizerInZoneGen = false;

async function terrainRandomizerZoneGen() {
    if (!game.dice3d) {
        ui.notifications.warn("Dice So Nice! Module not Enabled!");
        return;
    }
    if (!game.user.getFlag('dice-so-nice', 'settings')) {
        ui.notifications.warn("Please configure 3D Dice Settings in Dice So Nice! For the First Time");
        return;
    }
    _terrainRandomizerInZoneGen = true;
    const oldHide = game.user.getFlag('dice-so-nice', 'settings').timeBeforeHide;
    const oldForce = game.dice3d.box.throwingForce;
    // Terrain Randomizer relies on these scale values in order
    // to keep the dice closer to the center of the canvas
    game.dice3d.box.scene.scale.x = 0.4;
    game.dice3d.box.scene.scale.y = 0.4;
    game.dice3d.box.scene.scale.z = 0.4;
    let content = '';
    let areaSize = Roll.create('1d6');
    areaSize.roll({async: false});
    let zones;
    if (areaSize.total <= 3) {
        zones = Roll.create('1d3');
        content += `<h2>Area Size: ${'Small'}</h2>`;
    } else if (areaSize.total <= 5) {
        zones = Roll.create('1d4');
        content += `<h2>Area Size: ${'Medium'}</h2>`;
    } else {
        zones = Roll.create('1d6');
        content += `<h2>Area Size: ${'Large'}</h2>`;
    }
    zones.roll({async: false});

    function getSize() {
        size = Roll.create('1d6');
        size.roll({async: false});
        if (size.total === 1)
            return 0
        else if (size.total === 6)
            return 2
        else
            return 1
    }

    let zoneSizes = [];
    for (let z = 0; z < zones.total; z++) {
        zoneSize = getSize();
        if (zoneSize === 0)
            zoneSizes.push(2)
        else if (zoneSize === 1)
            zoneSizes.push(3)
        else
            zoneSizes.push(4)
    }
    let colors = ['red', 'green', 'blue', 'purple', 'black', 'fire'];
    let textColors = ['red', 'green', 'blue', 'purple', 'black', 'orange'];
    let i = 1;
    game.dice3d.box.clearAll();
    game.user.getFlag('dice-so-nice', 'settings').timeBeforeHide = 500000;
    game.dice3d.box.throwingForce = 'strong';
    zoneSizes.forEach(function (z) {
        console.log(`${z}d6[${colors[i - 1]}]`);
        let zoneRoll = Roll.create(`${z}d6[${colors[i - 1]}]`);
        zoneRoll.roll({async: false});
        console.log(zoneRoll);
        game.dice3d.showForRoll(zoneRoll).then(() => Hooks.call('diceSoNiceRollComplete'));
        content += `<span style="color:${textColors[i - 1]}">Zone ${i}: ${z === 4 ? 'Large' : z === 3 ? 'Medium' : 'Small'} (${z})<br>`;
        i += 1;
    });
    await ChatMessage.create({content: content, whisper: [game.users.contents.find(u => u.isGM).id]});
    Hooks.once('diceSoNiceRollComplete', async () => {
        game.user.getFlag('dice-so-nice', 'settings').timeBeforeHide = oldHide;
        game.dice3d.box.throwingForce = oldForce;
        const chatMsg = new ChatMessage({
            content: `<div><b>Draw zones!</b></div><button>Click to Hide Zone Dice</button>`
        });
        let rollingHtml = await chatMsg.getHTML();
        if ($("#chat-popout").length) {
            $("#chat-popout").find("#chat-log").append(rollingHtml);
            Object.values(ui.windows).find(w => w.constructor.name === 'ChatLog').scrollBottom();
        } else {
            $("#chat").find("#chat-log").append(rollingHtml);
            ui.chat.scrollBottom();
        }
        rollingHtml.find('button').click(() => _trClearDice(rollingHtml));
        // on the next roll, restart scale if we are doing anything else than generating a zone
        Hooks.once('diceSoNiceRollStart', () => {
            if (!_terrainRandomizerInZoneGen) {
                game.dice3d.box.clearAll();
                game.dice3d.box.scene.scale.x = 1;
                game.dice3d.box.scene.scale.y = 1;
                game.dice3d.box.scene.scale.z = 1;
            }
            rollingHtml.remove();
        });
        _terrainRandomizerInZoneGen = false;
    });
}

function _trClearDice(chatHtml) {
    game.dice3d.box.clearAll();
    chatHtml.remove();
}

async function _trTableLookup(tableName) {
    return game.tables.contents.find(t => t.name === tableName) ?? (await game.packs.get('terrain-randomizer.terrain-randomizer-tables').getDocuments()).find(t => t.name === tableName);
}

async function terrainRandomizerHazardGen() {
    const decoType = (await (await _trTableLookup('TR - Type')).roll()).results[0].getChatText();
    ChatMessage.create({content: `
        <h2>Zone Decorator</h2>
        <b>Affects</b>: ${(await (await _trTableLookup('TR - AoE')).roll()).results[0].getChatText()}<br>
        <b>Is a</b>: ${decoType}<br>
        <b>Of</b>: ${(await (await _trTableLookup('TR - Subtype')).roll()).results[0].getChatText()}<br>
        <b>With potency</b>: ${(await (await _trTableLookup('TR - Potency')).roll()).results[0].getChatText()}<br>
        <b>That triggers</b>: ${(await (await _trTableLookup('TR - Temporality')).roll()).results[0].getChatText()}<br>
        ${decoType.toLowerCase().includes('hazard') ? `<b>Hazard Special</b>: ${(await (await _trTableLookup('TR - Hazard')).roll()).results[0].getChatText()}<br>` : ''}
    `, whisper: [game.users.contents.find(u => u.isGM).id]})
}