async function terrainRandomizerZoneGen() {
    if (!game.dice3d) {
        ui.notifications.warn("Dice So Nice! Module not Enabled!");
        return;
    }
    if (!game.user.getFlag('dice-so-nice', 'settings')) {
        ui.notifications.warn("Please configure 3D Dice Settings in Dice So Nice! For the First Time");
        return;
    }
    var oldHide = game.user.getFlag('dice-so-nice', 'settings').timeBeforeHide;
    var oldAutoScale = game.user.getFlag('dice-so-nice', 'settings').autoscale;
    var oldScale = game.user.getFlag('dice-so-nice', 'settings').scale;
    var oldThrowingForce = game.user.getFlag('dice-so-nice', 'settings').throwingForce;

    let content = '';
    let areaSize = Roll.create('1d6');
    areaSize.roll();
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
    zones.roll();
    await ChatMessage.create({content: content});

    function getSize() {
        size = Roll.create('1d6');
        size.roll();
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
    let colors = ['red', 'green', 'blue', 'purple', 'black', 'yellow'];
    let i = 1;
    game.user.getFlag('dice-so-nice', 'settings').timeBeforeHide = 500000;
    game.user.getFlag('dice-so-nice', 'settings').autoscale = false;
    game.user.getFlag('dice-so-nice', 'settings').scale = 35;
    game.user.getFlag('dice-so-nice', 'settings').throwingForce = 'weak';
    zoneSizes.forEach(function (z) {
        let zoneRoll = Roll.create(`${z}d6[${colors[i - 1]}]`);
        zoneRoll.roll();
        zoneRoll.toMessage({content: `<span style="color:${colors[i - 1]}">Zone ${i}: ${z === 4 ? 'Large' : z === 3 ? 'Medium' : 'Small'} (${z})<br>`});
        i += 1;
    });
    Hooks.once('diceSoNiceRollComplete', () => {
        game.user.getFlag('dice-so-nice', 'settings').timeBeforeHide = oldHide;
        game.user.getFlag('dice-so-nice', 'settings').autoscale = oldAutoScale;
        game.user.getFlag('dice-so-nice', 'settings').scale = oldScale;
        game.user.getFlag('dice-so-nice', 'settings').throwingForce = oldThrowingForce;
        ChatMessage.create({
            content: `<div><b>Draw zones!</b></div><button class="tr-clear-dice">Finished! - Hide Dice</button>`
        }).then((chatMsg) => {
            $(".tr-clear-dice").click(() => _trClearDice(chatMsg));
            setTimeout(() => {chatMsg.update({content: `<div><b>Zone Processed</b></div>`})}, 500000);
        });
    });
}

function _trClearDice(chatMsg) {
    game.dice3d.box.clearAll();
    chatMsg.update({content: `<div><b>Zone Processed</b></div>`});
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
    `})
}