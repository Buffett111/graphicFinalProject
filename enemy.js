function createEnemy(lv) {
    var enemy = new Object()
    console.log(lv)
    enemy.LV = Math.floor(Math.random() * (100 - lv)) + lv;
    enemy.HP = 100 + 5 * enemy.LV;
    enemy.atk = 4 + 2 * Math.floor(enemy.LV / 3);
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