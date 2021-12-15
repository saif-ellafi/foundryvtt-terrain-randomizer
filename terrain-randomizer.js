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
    let colors = ['red', 'green', 'blue', 'purple', 'black', 'orange'];
    let i = 1;
    game.dice3d.box.clearAll();
    game.user.getFlag('dice-so-nice', 'settings').timeBeforeHide = 500000;
    game.dice3d.box.throwingForce = 'strong';
    zoneSizes.forEach(function (z) {
        let zoneRoll = Roll.create(`${z}d6`);
        let diceRoll = zoneRoll.roll({async: false});
        diceRoll.dice[0].options.appearance = {
            colorset: 'custom',
            background: colors[i-1],
            outline: colors[i-1],
            edge: colors[i-1],
            system: 'standard'
        }
        game.dice3d.showForRoll(zoneRoll).then(() => Hooks.call('diceSoNiceRollComplete'));
        content += `<span style="color:${colors[i - 1]}">Zone ${i}: ${z === 4 ? 'Large' : z === 3 ? 'Medium' : 'Small'} (${z})<br>`;
        i += 1;
    });
    const whisper = ui.chat.getData().rollMode !== 'roll' ? [game.user] : undefined;
    await ChatMessage.create({content: content, whisper: whisper});
    Hooks.once('diceSoNiceRollComplete', async () => {
        game.user.getFlag('dice-so-nice', 'settings').timeBeforeHide = oldHide;
        game.dice3d.box.throwingForce = oldForce;
        const chatMsg = new ChatMessage({
            content: `<div><b>Draw zones!</b></div><button>Click to Hide Zone Dice</button>`,
            whisper: whisper
        });
        const popOutChat = Object.values(ui.windows).find(w => w.constructor.name === 'ChatLog');
        if (popOutChat) {
            const rollingFloatingHtml = await chatMsg.getHTML();
            popOutChat.element.find("#chat-log").append(rollingFloatingHtml);
            popOutChat.scrollBottom();
            rollingFloatingHtml.find('button').click(() => _trClearDice(rollingFloatingHtml));
        }
        const rollingHtml = await chatMsg.getHTML();
        ui.chat.element.find("#chat-log").append(rollingHtml);
        ui.chat.scrollBottom();
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
    const decoGenDialog = `
    <form>

    <div>
        <label for="decorationAmount" style="margin-right:30px;">How Many:</label>
        <select name="decorationAmount" id="tr-deco-count" style="margin-bottom:10px;width:260px"">
            <option value="one" selected>Just One</option>
            <option value="simple">Simple (1d2)</option>
            <option value="medium">Medium (1d4)</option>
            <option value="complex">Complex (1d6)</option>
        </select>
    </div>

    <div>
        <label for="hazardGenerator" style="margin-right:19px;">Hazard Type:</label>
        <select name="hazardGenerator" id="tr-hazard-gen" style="margin-bottom:10px;width:260px"">
            <option value="table" selected>Random</option>
            <option value="Hazard">Hazard</option>
            <option value="Block">Block</option>
            <option value="Distraction">Distraction</option>
            <option value="Hazard & Block">Hazard & Block</option>
            <option value="Hazard & Distraction">Hazard & Distraction</option>
            <option value="Block & Distraction">Block & Distraction</option>
            <option value="Hazard & Block & Distraction">Hazard & Block & Distraction</option>
        </select>
    </div>

    <div style="margin-bottom:5px;">
        <label for="decoTable1">Random Table 1:</label>
        <input name="decoTable1" id="tr-descriptor1-table" style="width:260px;" placeholder="Table Name">
    </div>

    <div style="margin-bottom:5px;">
        <label for="decoTable2">Random Table 2:</label>
        <input name="decoTable2" id="tr-descriptor2-table" style="width:260px;" placeholder="Table Name">
    </div>

    </form>
    `
    let dialogue = new Dialog({
        title: `Terrain Decorator`,
        content: decoGenDialog,
        render: (html) => {
            const table1 = game.user.getFlag('terrain-randomizer', 'tr-random-table-1');
            const table2 = game.user.getFlag('terrain-randomizer', 'tr-random-table-2');
            if (table1)
                html.find("#tr-descriptor1-table").val(table1);
            if (table2)
                html.find("#tr-descriptor2-table").val(table2);
        },
        buttons: {
            submit: {
                icon: '<i class="fas fa-comments"></i>',
                label: 'Generate Hazard',
                callback: async (html) => {
                    const whisper = ui.chat.getData().rollMode !== 'roll' ? [game.user] : undefined;
                    let decoCount;
                    const decoCountChoice = html.find("#tr-deco-count").val();
                    switch (decoCountChoice) {
                        case 'one': {
                            decoCount = 1;
                            break;
                        }
                        case 'simple': {
                            decoCount = Roll.create('1d2').roll({async: true}).total;
                            break;
                        }
                        case 'medium': {
                            decoCount = Roll.create('1d4').roll({async: true}).total;
                            break;
                        }
                        case 'complex': {
                            decoCount = Roll.create('1d6').roll({async: true}).total;
                            break;
                        }
                    }

                    const decoTypeChoice = html.find("#tr-hazard-gen").val();
                    const decoTable1name = html.find("#tr-descriptor1-table").val();
                    const decoTable2name = html.find("#tr-descriptor2-table").val();
                    if (decoTable1name.length)
                        game.user.setFlag('terrain-randomizer', 'tr-random-table-1', decoTable1name);
                    if (decoTable2name.length)
                        game.user.setFlag('terrain-randomizer', 'tr-random-table-2', decoTable2name);

                    let i = 0;
                    ChatMessage.create({content: `Generating ${decoCount} Decorations!`});
                    while (i < decoCount) {
                        i += 1;
                        let decoType;
                        if (!decoTypeChoice?.length || decoTypeChoice === 'table')
                            decoType = (await (await _trTableLookup('TR - Type')).roll()).results[0].getChatText();
                        else
                            decoType = decoTypeChoice;
                        let table1output;
                        let table2output;
                        if (decoTable1name.length)
                            table1output = (await game.tables.contents.find(t => t.name === decoTable1name.trim())?.draw({displayChat: false}))?.results[0].getChatText();
                        if (decoTable2name.length)
                            table2output = (await game.tables.contents.find(t => t.name === decoTable2name.trim())?.draw({displayChat: false}))?.results[0].getChatText();
                        ChatMessage.create({content: `
                        <h2>Zone Decoration (${i})</h2>
                        <div><u>${decoType}</u></div>
                        <div><b>Affects</b>: ${(await (await _trTableLookup('TR - AoE')).roll()).results[0].getChatText()}</div>
                        <div><b>With potency</b>: ${(await (await _trTableLookup('TR - Potency')).roll()).results[0].getChatText()}</div>
                        <div><b>That triggers</b>: ${(await (await _trTableLookup('TR - Temporality')).roll()).results[0].getChatText()}</div>
                        ${decoType.toLowerCase().includes('distraction') ? `<div><b>Distraction Type</b>: ${(await (await _trTableLookup('TR - Subtype')).roll()).results[0].getChatText()}</div>` : ''}
                        ${decoType.toLowerCase().includes('hazard') ? `<div><b>Hazard Special</b>: ${(await (await _trTableLookup('TR - Hazard')).roll()).results[0].getChatText()}</div>` : ''}
                        ${table1output?.length ? `<div><b>Property 1:</b> ${table1output}</div>` : ''}
                        ${table2output?.length ? `<div><b>Property 2:</b> ${table2output}</div>` : ''}
                    `, whisper: whisper})
                    }
                }
            }
        },
        default: "submit"
    })

    dialogue.render(true)
}