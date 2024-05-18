var playerLocation;
var nowRoom;

function initGame() {
    initMap();
    nowRoom = 0;
    playerLocation = { x: 0.0, y: 0.0, z: map[nowRoom].field[0][0] }

}
function move(dx, dy) {
    playerLocation.x += dx
    playerLocation.y += dy
    nowplace = { x: Math.floor(playerLocation.x), y: playerLocation.y }
    if (nowplace.x < 0) {
        if (map[nowRoom].left === -1)
            pushMap(nowRoom, 2)
        nowRoom = map[nowRoom].left
    } else if (nowplace.x >= map[nowRoom].xSize) {
        if (map[nowRoom].right === -1)
            pushMap(nowRoom, 3)
        nowRoom = map[nowRoom].right
    } else if (nowplace.y < 0) {
        if (map[nowRoom].up === -1)
            pushMap(nowRoom, 0)
        nowRoom = map[nowRoom].up
    } else if (nowplace.y >= map[nowRoom].ySize) {
        if (map[nowRoom].down === -1)
            pushMap(nowRoom, 1)
        nowRoom = map[nowRoom].down
    }
}