var gameover=false;
function createEnemy(lv) {
    var enemy = new Object()
    console.log(lv)
    enemy.LV = Math.floor(Math.random() * 30 ) + lv;
    enemy.HP = 70 + 5 * enemy.LV;
    enemy.atk = 5 + 2 * Math.floor(enemy.LV / 3);
    enemy.def = Math.floor(enemy.LV / 8);
    enemy.speeed = 10 + Math.floor(enemy.LV / 10);
    enemy.getDamage = (atk) => {
        enemy.HP -= Math.max(1, atk - Math.floor(enemy.def));
        var enemyS = document.getElementById("enemyStatment");
        enemyS.type = "text";
        enemyS.innerHTML = "Enemy:<br>LV:" + (enemy.LV).toString()
        enemyS.innerHTML = enemyS.innerHTML + "<br>HP:" + enemy.HP.toString()
        enemyS.innerHTML = enemyS.innerHTML + "<br>ATK:" + enemy.atk.toString()
        enemyS.innerHTML = enemyS.innerHTML + "<br>DEF:" + enemy.def.toString()
        enemyS.innerHTML = enemyS.innerHTML + "<br>SPD:" + enemy.speeed.toString()
        if (enemy.HP <= 0) {
            getXP(enemy.LV * 10);
            return 1;
        }
        return 0;
    };
    return enemy;
}

function enemy_attack() {
    var textBox = document.getElementById("textbox");
    textBox.type = "text";
    nowplace = { x: Math.floor(player.location.x), y: Math.floor(player.location.y) };
    const { x, y } = nowplace;
    var index = 0;
    for (var i = 0; i < map[player.nowRoom].mobLocation.length; ++i) {
        if (x == map[player.nowRoom].mobLocation[i].x && y == map[player.nowRoom].mobLocation[i].y) {
            index = i;
            break;
        }
    }
    // 敵人攻擊玩家
    if (getDamage(map[player.nowRoom].mobLocation[index].data.atk)) {
        // 玩家被擊敗
        textBox.innerHTML = "You were defeated by the enemy!";
        player.onBattle = false;
    } else {
        textBox.innerHTML += "<br>Enemy attacks! You receive " + Math.max(1, map[player.nowRoom].mobLocation[index].data.atk - Math.floor(player.def)) + " damage.";
    }

    // 檢查玩家是否倖存
    if (player.HP <= 0) {
        if(player.live>=1){
            player.live-=1
            player.HP=player.MAXHP
            textBox.innerHTML += "<br>You died! You have " + player.live + " lives left.";
        }
        else{
            textBox.innerHTML += " Game Over!";
            // 可以增加重置遊戲或其他遊戲結束邏輯
            gameover=true
        }

    }
}

