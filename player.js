
var player = {};
function initPlayer() {
    player.HP = 100;
    player.MAXHP = 100;
    player.LV = 1;
    player.exp = 0;
    //expreq = floor(1<<0.3lv) + delta
    player.atk = 10;
    player.def = 0;
    player.MAXMP = 100;
    player.MP = 100;
    player.speed = 10;
    player.nowRoom = 0;
    player.getKey = 0;
    player.onBattle = 0;

}
function initGame() {
    initPlayer();
    initMap();
    player.location = { x: map[player.nowRoom].xSize / 2 + 0.5, y: map[player.nowRoom].ySize / 2 + 0.5, z: map[player.nowRoom].field[map[player.nowRoom].xSize / 2][map[player.nowRoom].ySize / 2] }
}
function move(dx, dy) {
    if (player.onBattle) {
        return;
    }
    player.location.x += dx
    player.location.y += dy
    nowplace = { x: Math.floor(player.location.x), y: Math.floor(player.location.y) }

    if (nowplace.x < 0) {
        if (map[player.nowRoom].left === -1)
            pushMap(player.nowRoom, 2)
        player.nowRoom = map[player.nowRoom].left
        player.location.x = map[player.nowRoom].xSize - 0.5 //-0.1

    } else if (nowplace.x > map[player.nowRoom].xSize - 1) {
        if (map[player.nowRoom].right === -1)
            pushMap(player.nowRoom, 3)
        player.nowRoom = map[player.nowRoom].right
        player.location.x = 0.5
    } else if (nowplace.y < 0) {
        if (map[player.nowRoom].up === -1)
            pushMap(player.nowRoom, 0)
        player.location.y = map[player.nowRoom].ySize - 0.5 //-0.1
        player.nowRoom = map[player.nowRoom].up
    } else if (nowplace.y > map[player.nowRoom].ySize - 1) {
        if (map[player.nowRoom].down === -1)
            pushMap(player.nowRoom, 1)
        player.nowRoom = map[player.nowRoom].down
        player.location.y = 0.5
    }
    if (nowplace.x === map[player.nowRoom].keyLocation.x && nowplace.y === map[player.nowRoom].keyLocation.y) {
        map[player.nowRoom].keyLocation = { x: -1, y: -1 };
        player.getKey++;
        if (player.getKey == 3 && leftmonster == 0) {
            boss = true
        }
    }
    nowplace = { x: Math.floor(player.location.x), y: Math.floor(player.location.y) }
    const { x, y } = nowplace;
    var touchMob = false;
    var index = 0;
    for (var i = 0; i < map[player.nowRoom].mobLocation.length; ++i) {
        console.log(x,)
        if (x == map[player.nowRoom].mobLocation[i].x && y == map[player.nowRoom].mobLocation[i].y) {
            touchMob = true;
            index = i;
            break;
        }
    }
    // const mob = map[player.nowRoom].mobLocation.find(m => m.x === x && m.y === y);
    console.log(touchMob, x, y)
    if (touchMob) {
        // Handle mob encounter
        player.onBattle = true
        var textBox = document.getElementById("textbox");
        textBox.type = "text";
        console.log(map[player.nowRoom].mobLocation[index].data)
        textBox.innerHTML = "Enemy encountered!<br>What do you want to do?";
        document.body.appendChild(textBox);
        var enemyS = document.getElementById("enemyStatment");
        enemyS.type = "text";
        const nowEnemy = map[player.nowRoom].mobLocation[index].data
        enemyS.innerHTML = "Enemy:<br>LV:" + (nowEnemy.LV).toString()
        enemyS.innerHTML = enemyS.innerHTML + "<br>HP:" + nowEnemy.HP.toString()
        enemyS.innerHTML = enemyS.innerHTML + "<br>ATK:" + nowEnemy.atk.toString()
        enemyS.innerHTML = enemyS.innerHTML + "<br>DEF:" + nowEnemy.def.toString()
        enemyS.innerHTML = enemyS.innerHTML + "<br>SPD:" + nowEnemy.speeed.toString()

        var attackButton = document.createElement("button");
        attackButton.innerHTML = "Attack";
        attackButton.id = "attack";
        attackButton.addEventListener("click", attackEnemy);
        document.body.appendChild(attackButton);

        var runButton = document.createElement("button");
        runButton.innerHTML = "Run";
        runButton.id = "run";
        runButton.addEventListener("click", run);
        document.body.appendChild(runButton);
        console.log('find enemy');


    }
    player.location.z = map[player.nowRoom].field[nowplace.x][nowplace.y]
}
function regenHP(res) {
    player.HP += res;
    if (player.HP > player.MAXHP) player.HP = player.MAXHP;
}
function regenMP(res) {
    player.MP += res;
    if (player.MP > player.MAXMP) player.MP = player.MAXMP;
}
function getDamage(atk) {
    player.HP -= Math.max(1, atk - Math.floor(player.def));
    if (player.HP <= 0) {
        return 1;

    }
    return 0;
}
function getXP(exp) {
    player.exp += exp
    while (player.exp >= player.LV * 100) {
        player.exp -= player.LV * 100;
        player.LV++;
        player.MAXMP += 20;
        player.MAXHP += 20;
        player.atk += 1;
        player.def += 0.2;
        player.speeed += 0.5;
        player.HP = player.MAXHP;
        player.MP = player.MAXMP;
        return 1;
    }
    return 0;

}
function attackEnemy() {
    var textBox = document.getElementById("textbox");
    textBox.type = "text";
    nowplace = { x: Math.floor(player.location.x), y: Math.floor(player.location.y) }
    const { x, y } = nowplace;
    var index = 0;
    for (var i = 0; i < map[player.nowRoom].mobLocation.length; ++i) {
        // console.log(x,)
        if (x == map[player.nowRoom].mobLocation[i].x && y == map[player.nowRoom].mobLocation[i].y) {
            index = i;
            break;
        }
    }
    textBox.innerHTML = "";
    console.log(player.speed < map[player.nowRoom].mobLocation[index].data.speed, map[player.nowRoom].mobLocation[index].data.speed)
    if (player.speed < map[player.nowRoom].mobLocation[index].data.speed) {
        textBox.innerHTML = textBox.innerHTML + "GET DAMAGE!<br>You get " + Math.max(1, player.atk - Math.floor(map[player.nowRoom].mobLocation[i].data.def)).toString() + " damage";
        if (getDamage(map[player.nowRoom].mobLocation[index].data.atk)) {
            //gameover
        }
    }

    if (map[player.nowRoom].mobLocation[index].data.getDamage(player.atk)) {
        textBox.innerHTML = "you win!";
        killMonster(player.nowRoom, nowplace.x, nowplace.y);
        return;
    } else {
        textBox.innerHTML = textBox.innerHTML + "<br>ATTACK!<br>You attack " + Math.max(1, player.atk - Math.floor(map[player.nowRoom].mobLocation[i].data.def)).toString() + " hp";

    }
    if (player.speed >= map[player.nowRoom].mobLocation[index].data.speed) {
        textBox.innerHTML = textBox.innerHTML + "<br>GET DAMAGE!<br>You get " + Math.max(1, player.atk - Math.floor(map[player.nowRoom].mobLocation[i].data.def)).toString() + " damage";
        if (getDamage(map[player.nowRoom].mobLocation[index].data.atk)) {
            //gameover
        }
    }
}
function run() {
    var textBox = document.getElementById("textbox");
    textBox.type = "text";
    if (Math.random() < 0.3) {
        textBox.textContent = "run success";
        player.onBattle = false;
        var attackButton = document.getElementById("attack");
        attackButton.parentNode.removeChild(attackButton);
        var runButton = document.getElementById("run");
        runButton.parentNode.removeChild(runButton);
    } else {
        console.log('fail')
        textBox.textContent = "run fail";
    }
}