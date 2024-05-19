async function main() {
    canvas = document.getElementById('webgl');
    gl = canvas.getContext('webgl2');
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }
    program = compileShader(gl, VSHADER_SOURCE, FSHADER_SOURCE);
    initProgram(program);
    //setup shaders and prepare shader variables
    shadowProgram = compileShader(gl, VSHADER_SHADOW_SOURCE, FSHADER_SHADOW_SOURCE);
    shadowProgram.a_Position = gl.getAttribLocation(shadowProgram, 'a_Position');
    shadowProgram.u_MvpMatrix = gl.getUniformLocation(shadowProgram, 'u_MvpMatrix');

    programEnvCube = compileShader(gl, VSHADER_SOURCE_ENVCUBE, FSHADER_SOURCE_ENVCUBE);
    programEnvCube.a_Position = gl.getAttribLocation(programEnvCube, 'a_Position');
    programEnvCube.u_envCubeMap = gl.getUniformLocation(programEnvCube, 'u_envCubeMap');
    programEnvCube.u_viewDirectionProjectionInverse =
        gl.getUniformLocation(programEnvCube, 'u_viewDirectionProjectionInverse');


    var quad = new Float32Array(
        [
            -1, -1, 1,
            1, -1, 1,
            -1, 1, 1,
            -1, 1, 1,
            1, -1, 1,
            1, 1, 1
        ]); //just a quad

    //load model;
    // cubeMapTex = initCubeTexture("pos-x.jpg", "neg-x.jpg", "pos-y.jpg", "neg-y.jpg",
    //     "pos-z.jpg", "neg-z.jpg", 512, 512)
    cubeMapTex = initCubeTexture("px.png", "nx.png", "py.png", "ny.png",
        "pz.png", "nz.png", 256, 256);
    quadObj = initVertexBufferForLaterUse(gl, quad);
    // 調用parseModel函數來載入cube.obj
    cubeObj = await parseModel('object/cube.obj');
    //console.log(cubeObj);

    bushObj = await parseModel('object/bushes/01/bush_01.obj');
    rockObj = await parseModel('object/rocks/01/rock_01.obj');
    onloadTexture("brick", "texture/brick.jpg")
    onloadTexture("stone", "texture/stone_wall.png")
    onloadTexture("bush", "object/bushes/01/diffuse.png");
    onloadTexture("rock", "object/rocks/01/diffuse.png");

    response = await fetch('object/sonic-the-hedgehog.mtl');
    const mtlText = await response.text();
    //console.log('mtlText'+mtlText)
    mtl = parseMTL(mtlText);

    imgNames = addTexturesToImgNames(mtl);
    numTextures = imgNames.length

    response = await fetch('object/sonic.obj');
    text = await response.text();
    var obj = parseOBJ(text);
    objCompImgIndex = parsetexture(text, mtl);
    for (let i = 0; i < obj.geometries.length; i++) {
        let o = initVertexBufferForLaterUse(gl,
            obj.geometries[i].data.position,
            obj.geometries[i].data.normal,
            obj.geometries[i].data.texcoord);
        playerObj.push(o);
    }

    for (let i = 0; i < imgNames.length; i++) {
        let image = new Image();
        image.onload = function () { initTexture(gl, image, imgNames[i]); };
        image.src = imgNames[i];
    }

    console.log(objCompImgIndex)
    initGame();


    gl.useProgram(program);


    // putModel('location', objname);


    // onloadTexture('tex', 'location')

    //fboShadow = initFrameBuffer(gl);
    //fbo = initFrameBuffer(gl);
    console.log("done")
    //x,z,y


    mvpMatrix = new Matrix4();
    modelMatrix = new Matrix4();
    normalMatrix = new Matrix4();
    rotateMatrix = new Matrix4();


    draw();//draw it once before mouse move

    canvas.onmousedown = function (ev) { mouseDown(ev) };
    canvas.onmousemove = function (ev) { mouseMove(ev) };
    canvas.onmouseup = function (ev) { mouseUp(ev) };
    //canvas.onwheel = function (ev) { scroll(ev) };
    // var menu = document.getElementById("menu");
    // menu.onchange = function () {
    //     // if (this.value == "normal") normalMode = true;
    //     // else normalMode = false;
    //     draw();
    // }
    document.addEventListener('keydown', function (event) {
        switch (event.key) {
            case 'w':
            case 'W':
                move(1, 0);
                break;
            case 's':
            case 'S':
                move(-1, 0);
                break;
            case 'a':
            case 'A':
                move(0, -1);
                break;
            case 'd':
            case 'D':
                move(0, 1);
                break;
        }
        draw(); // Redraw the scene with the new camera position
    });
    var tick = function () {
        angle += speed;
        lX = centerX + radius * Math.cos(angle);
        lZ = centerY + radius * Math.sin(angle);

        draw();

        requestAnimationFrame(tick);
    }
    tick();
}