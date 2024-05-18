function createEnemy() {
    var enemy = new Object()
    enemy.LV = Math.floor(Math.random() * (100 - player.LV)) + player.LV;
    enemy.HP = 100 + 20 * enemy.LV;
    enemy.atk = 4 + 2 * Math.floor(enemy.LV / 3);
    enemy.def = Math.floor(enemy.LV / 5);
    enemy.speeed = 10 + Math.floor(enemy.LV / 10);
    enemy.getDamage = function (atk) {
        enemy.HP -= Math.max(1, atk - Math.floor(enemy.def));
        if (enemy.HP <= 0) {
            getXP(enemy.LV * 10);
            return 1;
        }
        return 0;
    };
    return enemy;

}