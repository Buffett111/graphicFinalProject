
var player = {};
function initGame() {
    initMap();
    player.nowRoom = 0;
    player.getKey = 0;
    player.location = { x: 0.0, y: 0.0, z: map[player.nowRoom].field[0][0] }
}
function move(dx, dy) {
    player.location.x += dx
    player.location.y += dy
    nowplace = { x: Math.floor(player.location.x), y: player.location.y }
    if (nowplace.x < 0) {
        if (map[player.nowRoom].left === -1)
            pushMap(player.nowRoom, 2)
        player.nowRoom = map[player.nowRoom].left
        player.location.x = map[player.nowRoom].xSize - 0.1
    } else if (nowplace.x >= map[player.nowRoom].xSize) {
        if (map[player.nowRoom].right === -1)
            pushMap(player.nowRoom, 3)
        player.nowRoom = map[player.nowRoom].right
        player.location.x = 0.1
    } else if (nowplace.y < 0) {
        if (map[player.nowRoom].up === -1)
            pushMap(player.nowRoom, 0)
        player.location.y = map[player.nowRoom].ySize - 0.1
        player.nowRoom = map[player.nowRoom].up
    } else if (nowplace.y >= map[player.nowRoom].ySize) {
        if (map[player.nowRoom].down === -1)
            pushMap(player.nowRoom, 1)
        player.nowRoom = map[player.nowRoom].down
        player.location.y = 0.1
    }
    if (nowplace.x === map[player.nowRoom].keyLocation.x && nowplace.y === map[player.nowRoom].leyLocation.y) {
        map[player.nowRoom].keyLocation = { x: -1, y: -1 };
        player.getKey++;
        if (player.getKey == 3) {
            boss = true
        }
    }
}