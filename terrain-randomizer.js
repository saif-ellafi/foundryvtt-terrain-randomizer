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

    const zoneGenDialog = `
    <form>

    <div>
        <label for="tr-zone-count" style="margin-right:30px;">Area Layout:</label>
        <select id="tr-zone-count" style="margin-bottom:10px;width:260px"">
            <option value="random" selected>Random</option>
            <option value="upTo3">Up to 3 Zones</option>
            <option value="upTo4">Up to 4 Zones</option>
            <option value="upTo6">Up to 6 Zones</option>
            <option value="simple">Simple</option>
            <option value="complex">Complex</option>
            <option value="clutter">Cluttered</option>
        </select>
    </div>

    </form>
    `
    let dialogue = new Dialog({
        title: `Zone Generator`,
        content: zoneGenDialog,
        buttons: {
            submit: {
                icon: '<i class="fas fa-dice"></i>',
                label: 'Generate Zones',
                callback: async () => {
                    _terrainRandomizerInZoneGen = true;
                    const oldHide = game.user.getFlag('dice-so-nice', 'settings').timeBeforeHide;
                    const oldForce = game.dice3d.box.throwingForce;
                    // Terrain Randomizer relies on these scale values in order
                    // to keep the dice closer to the center of the canvas
                    const calculated = Math.log10(canvas.scene.dimensions.width)/8;
                    game.dice3d.box.scene.scale.x = calculated;
                    game.dice3d.box.scene.scale.y = calculated;
                    game.dice3d.box.scene.scale.z = calculated;
                    const zoneCount = $("#tr-zone-count").val();
                    let content = '';
                    let zones;
                    switch (zoneCount) {
                        case "random": {
                            const areaSize = Roll.create('1d6');
                            areaSize.roll({async: false});
                            if (areaSize.total <= 3) {
                                zones = Roll.create('1d3');
                                zones.roll({async: false});
                                content += `<h2>Area Layout: ${zones.total} Zones</h2>`;
                            } else if (areaSize.total <= 5) {
                                zones = Roll.create('1d4');
                                zones.roll({async: false});
                                content += `<h2>Area Layout: ${zones.total} Zones</h2>`;
                            } else {
                                zones = Roll.create('1d6');
                                zones.roll({async: false});
                                content += `<h2>Area Layout: ${zones.total} Zones</h2>`;
                            }
                            break;
                        }
                        case "upTo3": {
                            zones = Roll.create('1d3');
                            zones.roll({async: false});
                            content += `<h2>Area Layout: ${zones.total} Zones</h2>`;
                            break;
                        }
                        case "upTo4": {
                            zones = Roll.create('1d4');
                            zones.roll({async: false});
                            content += `<h2>Area Layout: ${zones.total} Zones</h2>`;
                            break;
                        }
                        case "upTo6": {
                            zones = Roll.create('1d6');
                            zones.roll({async: false});
                            content += `<h2>Area Layout: ${zones.total} Zones</h2>`;
                            break;
                        }
                        case "simple": {
                            zones = Roll.create('1d2+1');
                            zones.roll({async: false});
                            content += `<h2>Area Layout: ${zones.total} Zones</h2>`;
                            break;
                        }
                        case "complex": {
                            zones = Roll.create('1d4+1');
                            zones.roll({async: false});
                            content += `<h2>Area Layout: ${zones.total} Zones</h2>`;
                            break;
                        }
                        case "clutter": {
                            zones = Roll.create('1d3+3');
                            zones.roll({async: false});
                            content += `<h2>Area Layout: ${zones.total} Zones</h2>`;
                            break;
                        }
                    }

                    function getSize() {
                        const size = Roll.create('1d6');
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
                        const zoneSize = getSize();
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
                    game.canvas.pan({
                        x: game.canvas.scene.dimensions.width / 2,
                        y: game.canvas.scene.dimensions.height / 2,
                        scale: 0
                    });
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
                        content += `<span style="color:${colors[i - 1]}">Zone ${i}: ${z === 4 ? 'Large' : z === 3 ? 'Medium' : 'Small'} (${z} nodes)<br>`;
                        i += 1;
                    });
                    const whisper = ui.chat.getData().rollMode !== 'roll' ? [game.user] : undefined;
                    await ChatMessage.create({content: content, whisper: whisper});
                    if (ui.controls.activeControl !== 'drawings')
                        game.canvas.drawings.activate();
                    Hooks.once('diceSoNiceRollComplete', async () => {
                        if (ui.controls.activeTool === 'select')
                            $(".control-tool[data-tool='freehand']").click();
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
            }
        },
        default: "submit"
    })

    dialogue.render(true)
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
        <label for="tr-deco-count" style="margin-right:30px;">How Many:</label>
        <select id="tr-deco-count" style="margin-bottom:10px;width:260px"">
            <option value="one" selected>Just One</option>
            <option value="simple">Simple (1d2)</option>
            <option value="medium">Medium (1d4)</option>
            <option value="complex">Complex (1d6)</option>
        </select>
    </div>

    <div>
        <label for="tr-hazard-gen" style="margin-right:19px;">Hazard Type:</label>
        <select id="tr-hazard-gen" style="margin-bottom:10px;width:260px"">
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
        <label for="tr-descriptor1-table">Random Table 1:</label>
        <select id="tr-descriptor1-table" style="width:260px;"><option>None</option></select>
    </div>

    <div style="margin-bottom:5px;">
        <label for="tr-descriptor2-table">Random Table 2:</label>
        <select id="tr-descriptor2-table" style="width:260px;"><option>None</option></select>
    </div>

    </form>
    `
    let dialogue = new Dialog({
        title: `Terrain Decorator`,
        content: decoGenDialog,
        render: (html) => {
            const table1 = game.user.getFlag('terrain-randomizer', 'tr-random-table-1');
            const table2 = game.user.getFlag('terrain-randomizer', 'tr-random-table-2');
            const mythicTables = game.tables.contents.map(t => t.name);
            const tableEntries1 = html.find('#tr-descriptor1-table');
            const tableEntries2 = html.find('#tr-descriptor2-table');
            mythicTables.forEach(t => {
                tableEntries1.append(`<option value="${t}">${t}</option>`);
                tableEntries2.append(`<option value="${t}">${t}</option>`);
            });
            if (table1)
                html.find("#tr-descriptor1-table").val(table1);
            if (table2)
                html.find("#tr-descriptor2-table").val(table2);
        },
        buttons: {
            submit: {
                icon: '<i class="fas fa-dice"></i>',
                label: 'Generate Decorations',
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
                            decoCount = (await Roll.create('1d2').roll({async: true})).total;
                            break;
                        }
                        case 'medium': {
                            decoCount = (await Roll.create('1d4').roll({async: true})).total;
                            break;
                        }
                        case 'complex': {
                            decoCount = (await Roll.create('1d6').roll({async: true})).total;
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