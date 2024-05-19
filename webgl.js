var VSHADER_SOURCE = `
    attribute vec4 a_Position;
    attribute vec4 a_Normal;
    attribute vec2 a_TexCoord;
    uniform mat4 u_MvpMatrix;
    uniform mat4 u_modelMatrix;
    uniform mat4 u_normalMatrix;
    uniform mat4 u_MvpMatrixOfLight;
    varying vec3 v_Normal;
    varying vec3 v_PositionInWorld;
    varying vec2 v_TexCoord;
    uniform mat4 u_ProjMatrixFromLight;
    varying vec4 v_PositionFromLight;

    void main(){
        gl_Position = u_MvpMatrix * a_Position;
        v_PositionInWorld = (u_modelMatrix * a_Position).xyz; 
        v_Normal = normalize(vec3(u_normalMatrix * a_Normal));
        v_PositionFromLight = u_MvpMatrixOfLight * a_Position; //for shadow
        v_TexCoord = a_TexCoord;
    }    
`;

var FSHADER_SOURCE = `
    precision mediump float;
    uniform vec3 u_LightPosition;
    uniform vec3 u_ViewPosition;
    uniform float u_Ka;
    uniform float u_Kd;
    uniform float u_Ks;
    uniform float u_Alpha;
    uniform float u_shininess;
    uniform sampler2D u_Sampler;
    uniform vec3 u_Color;
    uniform sampler2D u_ShadowMap;
    varying vec3 v_Normal;
    varying vec3 v_PositionInWorld;
    varying vec2 v_TexCoord;
    varying vec4 v_PositionFromLight;
    const float deMachThreshold = 0.005; //0.001 if having high precision depth
    // varying vec2 v_texcoord;
    uniform sampler2D u_texture;
    float unpackFloatFromVec4i(const vec4 value) {
        const vec4 bitSh = vec4(1.0/(256.0*256.0*256.0), 1.0/(256.0*256.0), 1.0/256.0, 1.0);
        return(dot(value, bitSh));
      }
    void main(){ 
        vec3 texColor = texture2D( u_Sampler, v_TexCoord ).rgb;
        vec3 ambientLightColor = texColor;
        vec3 diffuseLightColor = texColor;
        vec3 specularLightColor = vec3(1.0, 1.0, 1.0);        

        vec3 ambient = ambientLightColor * u_Ka;

        vec3 normal = normalize(v_Normal);
        vec3 lightDirection = normalize(u_LightPosition - v_PositionInWorld);
        float nDotL = max(dot(lightDirection, normal), 0.0);
        vec3 diffuse = diffuseLightColor * u_Kd * nDotL;

        vec3 specular = vec3(0.0, 0.0, 0.0);
        if(nDotL > 0.0) {
            vec3 R = reflect(-lightDirection, normal);
            // V: the vector, point to viewer       
            vec3 V = normalize(u_ViewPosition - v_PositionInWorld); 
            float specAngle = clamp(dot(R, V), 0.0, 1.0);
            specular = u_Ks * pow(specAngle, u_shininess) * specularLightColor; 
        }

        //***** shadow
        vec3 shadowCoord = (v_PositionFromLight.xyz/v_PositionFromLight.w)/2.0 + 0.5;
        vec4 rgbaDepth = texture2D(u_ShadowMap, shadowCoord.xy);
        /////////******** LOW precision depth implementation ********///////////
        // float depth = rgbaDepth.r;
        float depth = unpackFloatFromVec4i(rgbaDepth);
        float visibility = (shadowCoord.z > depth + deMachThreshold) ? 0.3 : 1.0;
        // gl_FragColor = texture2D(u_texture, v_TexCoord);

        gl_FragColor = vec4( (ambient + diffuse + specular)*visibility, 1.0);
    }
`;
var VSHADER_SHADOW_SOURCE = `
      attribute vec4 a_Position;
      uniform mat4 u_MvpMatrix;
      void main(){
          gl_Position = u_MvpMatrix * a_Position;
      }
  `;

var FSHADER_SHADOW_SOURCE = `
    precision mediump float;
    vec4 packFloatToVec4i(const float value) {
        const vec4 bitSh = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);
        const vec4 bitMsk = vec4(0.0, 1.0/256.0, 1.0/256.0, 1.0/256.0);
        vec4 res = fract(value * bitSh);
        res -= res.xxyz * bitMsk;
        return res;
      }
     
    void main(){
    /////////** LOW precision depth implementation **/////
        // gl_FragColor = vec4(gl_FragCoord.z,0.0,0.0, 1.0);
        gl_FragColor = packFloatToVec4i(gl_FragCoord.z);
    }
  `;
var VSHADER_SOURCE_ENVCUBE = `
  attribute vec4 a_Position;
  varying vec4 v_Position;
  void main() {
    v_Position = a_Position;
    gl_Position = a_Position;
  } 
`;

var FSHADER_SOURCE_ENVCUBE = `
  precision mediump float;
  uniform samplerCube u_envCubeMap;
  uniform mat4 u_viewDirectionProjectionInverse;
  varying vec4 v_Position;
  void main() {
    vec4 t = u_viewDirectionProjectionInverse * v_Position;
    gl_FragColor = textureCube(u_envCubeMap, normalize(t.xyz / t.w));
  }
`;

var VSHADER_SOURCE_TEXTURE_ON_CUBE = `
  attribute vec4 a_Position;
  attribute vec4 a_Normal;
  uniform mat4 u_MvpMatrix;
  uniform mat4 u_modelMatrix;
  uniform mat4 u_normalMatrix;
  varying vec4 v_TexCoord;
  varying vec3 v_Normal;
  varying vec3 v_PositionInWorld;
  void main() {
    gl_Position = u_MvpMatrix * a_Position;
    v_TexCoord = a_Position;
    v_PositionInWorld = (u_modelMatrix * a_Position).xyz; 
    v_Normal = normalize(vec3(u_normalMatrix * a_Normal));
  } 
`;

var FSHADER_SOURCE_TEXTURE_ON_CUBE = `
  precision mediump float;
  varying vec4 v_TexCoord;
  uniform vec3 u_ViewPosition;
  uniform vec3 u_Color;
  uniform samplerCube u_envCubeMap;
  varying vec3 v_Normal;
  varying vec3 v_PositionInWorld;
  void main() {
    vec3 V = normalize(u_ViewPosition - v_PositionInWorld); 
    vec3 normal = normalize(v_Normal);
    vec3 R = reflect(-V, normal);
    gl_FragColor = vec4(0.78 * textureCube(u_envCubeMap, R).rgb + 0.3 * u_Color, 1.0);
  }
`;

function compileShader(gl, vShaderText, fShaderText) {
    //////Build vertex and fragment shader objects
    var vertexShader = gl.createShader(gl.VERTEX_SHADER)
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
    //The way to  set up shader text source
    gl.shaderSource(vertexShader, vShaderText)
    gl.shaderSource(fragmentShader, fShaderText)
    //compile vertex shader
    gl.compileShader(vertexShader)
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.log('vertex shader ereror');
        var message = gl.getShaderInfoLog(vertexShader);
        console.log(message);//print shader compiling error message
    }
    //compile fragment shader
    gl.compileShader(fragmentShader)
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.log('fragment shader ereror');
        var message = gl.getShaderInfoLog(fragmentShader);
        console.log(message);//print shader compiling error message
    }

    /////link shader to program (by a self-define function)
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    //if not success, log the program info, and delete it.
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        alert(gl.getProgramInfoLog(program) + "");
        gl.deleteProgram(program);
    }

    return program;
}
var texture={};
var cameraX=0,cameraY=15,cameraZ=7;
var cameraX2=0,cameraY2=0,cameraZ2=0;
var cameraDirX=0,cameraDirY=0,cameraDirZ=-1;
var imgNames=[];
var objCompImgIndex=[];

var camX=0,camY=0,camZ=0;
var lightX=0,lightY=10,lightZ=3;
var angleX=0,angleY=0;
var gl;
var fbo;
var quadObj;
var cubeObj=[];
var bushObj;
var rockObj;
var sphereObj;
//var offScreenWidth=2048,offScreenHeight=2048;
var offScreenWidth = 256, offScreenHeight = 256; //for cubemap render
var cubeMapTex;
var textures = {};
var texCount=0;
var numTextures=1;
var mvpMatrix;
var modelMatrix; 
var normalMatrix; 
var rotateMatrix;
var objScale=0.3;
var mouseLastX, mouseLastY;
var playerObj=[];
var mouseDragging = false;
var angle = 0;
var radius = 5;  // 光源繞圈的半徑
var lX,lZ;
var centerX = 0; // 繞圈的中心位置 X
var centerY = 0; // 繞圈的中心位置 Y
var speed = 0.01; // 光源轉動的速度

var fbo;
async function parseModel(file) {
    try {
        let response = await fetch(file);
        let text = await response.text();
        let obj = parseOBJ(text);
        let O = [];
        for (let i = 0; i < obj.geometries.length; i++) {
            let o = initVertexBufferForLaterUse(gl,
                obj.geometries[i].data.position,
                obj.geometries[i].data.normal,
                obj.geometries[i].data.texcoord);
            O.push(o);
        }
        return O;
    } catch (error) {
        console.error('Error loading model:', error);
        return null;
    }
}

function onloadTexture(tex, file) {
    var img = new Image();
    img.onload = function () { initTexture(gl, img, tex); };
    img.src = file;
}

function mouseDown(ev) {
    var x = ev.clientX;
    var y = ev.clientY;
    var rect = ev.target.getBoundingClientRect();
    if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
        mouseLastX = x;
        mouseLastY = y;
        mouseDragging = true;
    }
}




function initFrameBuffer(gl) {
    //create and set up a texture object as the color buffer

    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, offScreenWidth, offScreenHeight,
        0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);


    //create and setup a render buffer as the depth buffer
    var depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16,
        offScreenWidth, offScreenHeight);

    //create and setup framebuffer: linke the color and depth buffer to it
    var frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D, texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
        gl.RENDERBUFFER, depthBuffer);
    frameBuffer.texture = texture;
    return frameBuffer;
}

function initProgram(program) {
    program.a_Position = gl.getAttribLocation(program, 'a_Position');
    program.a_Normal = gl.getAttribLocation(program, 'a_Normal');
    program.u_MvpMatrix = gl.getUniformLocation(program, 'u_MvpMatrix');
    program.u_modelMatrix = gl.getUniformLocation(program, 'u_modelMatrix');
    program.u_normalMatrix = gl.getUniformLocation(program, 'u_normalMatrix');
    program.u_LightPosition = gl.getUniformLocation(program, 'u_LightPosition');
    program.u_ViewPosition = gl.getUniformLocation(program, 'u_ViewPosition');
    program.u_MvpMatrixOfLight = gl.getUniformLocation(program, 'u_MvpMatrixOfLight');
    program.a_TexCoord = gl.getAttribLocation(program, 'a_TexCoord');
    program.u_Ka = gl.getUniformLocation(program, 'u_Ka');
    program.u_Kd = gl.getUniformLocation(program, 'u_Kd');
    program.u_Ks = gl.getUniformLocation(program, 'u_Ks');
    program.u_shininess = gl.getUniformLocation(program, 'u_shininess');
    program.u_ShadowMap = gl.getUniformLocation(program, "u_ShadowMap");
    program.u_Color = gl.getUniformLocation(program, 'u_Color');
    program.u_Alpha = gl.getUniformLocation(program, 'u_Alpha');
    program.u_Sampler = gl.getUniformLocation(program, "u_Sampler")
}
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

    programTextureOnCube = compileShader(gl, VSHADER_SOURCE_TEXTURE_ON_CUBE, FSHADER_SOURCE_TEXTURE_ON_CUBE);
    programTextureOnCube.a_Position = gl.getAttribLocation(programTextureOnCube, 'a_Position'); 
    programTextureOnCube.a_Normal = gl.getAttribLocation(programTextureOnCube, 'a_Normal'); 
    programTextureOnCube.u_MvpMatrix = gl.getUniformLocation(programTextureOnCube, 'u_MvpMatrix'); 
    programTextureOnCube.u_modelMatrix = gl.getUniformLocation(programTextureOnCube, 'u_modelMatrix'); 
    programTextureOnCube.u_normalMatrix = gl.getUniformLocation(programTextureOnCube, 'u_normalMatrix');
    programTextureOnCube.u_ViewPosition = gl.getUniformLocation(programTextureOnCube, 'u_ViewPosition');
    programTextureOnCube.u_envCubeMap = gl.getUniformLocation(programTextureOnCube, 'u_envCubeMap'); 
    programTextureOnCube.u_Color = gl.getUniformLocation(programTextureOnCube, 'u_Color'); 

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
    quadObj = initVertexBufferForLaterUse(gl, quad);
    cubeMapTex = initCubeTexture("pos-x.jpg", "neg-x.jpg", "pos-y.jpg", "neg-y.jpg",
        "pos-z.jpg", "neg-z.jpg", 512, 512)
    // cubeMapTex = initCubeTexture("px.png", "nx.png", "py.png", "ny.png",
    // "pz.png", "nz.png", 256, 256);
    // 調用parseModel函數來載入cube.obj
    cubeObj=await parseModel('object/cube.obj');
    //console.log(cubeObj);

    bushObj=await parseModel('object/bushes/01/bush_01.obj');
    rockObj=await parseModel('object/rocks/01/rock_01.obj');
    sphereObj=await parseModel('object/sphere.obj');
    onloadTexture("brick", "texture/brick.jpg")
    onloadTexture("stone", "texture/stone_wall.png")
    onloadTexture("bush", "object/bushes/01/diffuse.png");
    onloadTexture("rock", "object/rocks/01/diffuse.png");



    
    fbo = initFrameBufferForCubemapRendering(gl);

    response = await fetch('object/sonic-the-hedgehog.mtl');
    const mtlText = await response.text();
    //console.log('mtlText'+mtlText)
    mtl=parseMTL(mtlText);

    imgNames = addTexturesToImgNames(mtl);
    numTextures= imgNames.length

    response = await fetch('object/sonic.obj');
    text = await response.text();
    var obj = parseOBJ(text);
    objCompImgIndex = parsetexture(text,mtl);
    for( let i=0; i < obj.geometries.length; i ++ ){
        let o = initVertexBufferForLaterUse(gl, 
                                            obj.geometries[i].data.position,
                                            obj.geometries[i].data.normal, 
                                            obj.geometries[i].data.texcoord);
        playerObj.push(o);
    }

    for( let i=0; i < imgNames.length; i ++ ){
        let image = new Image();
        image.onload = function(){initTexture(gl, image, imgNames[i]);};
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
    var menu = document.getElementById("menu");
    menu.onchange = function () {
        // if (this.value == "normal") normalMode = true;
        // else normalMode = false;
        draw();
    }
    document.addEventListener('keydown', function(event) {
        // let rotateMatrix = new Matrix4();
        // rotateMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
        // rotateMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
        // var viewDir = new Vector3([cameraDirX, cameraDirY, cameraDirZ]);
        // var newViewDir = rotateMatrix.multiplyVector3(viewDir);
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
        //implment keydown event here
        // let rotateMatrix = new Matrix4();
        // rotateMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
        // rotateMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
        // var viewDir= new Vector3([cameraDirX, cameraDirY, cameraDirZ]);
        // var newViewDir = rotateMatrix.multiplyVector3(viewDir);

        // if(ev.key == 'w'){ 
        //     cameraX += (newViewDir.elements[0] * 0.1);
        //     cameraY += (newViewDir.elements[1] * 0.1);
        //     cameraZ += (newViewDir.elements[2] * 0.1);
        // }
        // else if(ev.key == 's'){ 
        //     cameraX -= (newViewDir.elements[0] * 0.1);
        //     cameraY -= (newViewDir.elements[1] * 0.1);
        //     cameraZ -= (newViewDir.elements[2] * 0.1);
        // }
        // draw();
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
function initTexture(gl, img, texKey) {
    var tex = gl.createTexture();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    // Set the parameters so we can render any size image.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    // Upload the image into the texture.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    textures[texKey] = tex;

    texCount++;
    //if (texCount == numTextures) draw();
}

function addTexturesToImgNames(mtl) {
let imgNames = [];  // Initialize an array to store the texture file names

// Loop through each key in the mtl dictionary
for (const materialName in mtl) {
    if (mtl.hasOwnProperty(materialName) && mtl[materialName].map_Kd) {
        // Check if the material exists and has a map_Kd property
        imgNames.push(mtl[materialName].map_Kd);  // Add the map_Kd to the imgNames array
    }
}

return imgNames;  // Return the array containing all the map_Kd values
}

function draw_rock_off(objComponents,mx,my,mz,tex,vpMatrix){
    modelMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
    modelMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
    modelMatrix.translate(mx*0.605,my*1.15,mz*0.625);
    modelMatrix.scale(0.005, 0.005, 0.005);
    //modelMatrix.scale(0.01, 0.01, 0.01);

    // modelMatrix.translate(0.0, 0.0, -1.0);
    // modelMatrix.scale(1.0, 0.5, 2.0);
    //mvp: projection * view * model matrix  
    mvpMatrix.set(vpMatrix);
    mvpMatrix.multiply(modelMatrix);


    //normal matrix
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();

    gl.useProgram(program);
    // gl.depthMask(false);
    gl.uniform3f(program.u_LightPosition, lightX,lightY,lightZ);
    gl.uniform3f(program.u_ViewPosition, cameraX, cameraY, cameraZ);
    gl.uniform1f(program.u_Ka, 0.2);
    gl.uniform1f(program.u_Kd, 0.7);
    gl.uniform1f(program.u_Ks, 1.0);
    gl.uniform1f(program.u_shininess, 15.0);
    gl.uniform1i(program.u_Sampler, 0);
    gl.uniform1f(program.u_Alpha, 1.0);

    gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);
    gl.uniformMatrix4fv(program.u_modelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(program.u_normalMatrix, false, normalMatrix.elements);
    //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[tex]);
    for( let i=0; i < objComponents.length; i ++ ){
        initAttributeVariable(gl, program.a_Position, objComponents[i].vertexBuffer);
        initAttributeVariable(gl, program.a_TexCoord, objComponents[i].texCoordBuffer);
        initAttributeVariable(gl, program.a_Normal, objComponents[i].normalBuffer);
        gl.drawArrays(gl.TRIANGLES, 0, objComponents[i].numVertices);
    }
    // gl.depthMask(true);
}
function draw_rock(objComponents,mx,my,mz,tex,cameraX,cameraY,cameraZ){
    modelMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
    modelMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
    modelMatrix.translate(mx*0.605,my*1.15,mz*0.625);
    modelMatrix.scale(0.005, 0.005, 0.005);
    //modelMatrix.scale(0.01, 0.01, 0.01);

    // modelMatrix.translate(0.0, 0.0, -1.0);
    // modelMatrix.scale(1.0, 0.5, 2.0);
    //mvp: projection * view * model matrix  
    mvpMatrix.setPerspective(30, 1, 1, 100);
    mvpMatrix.lookAt(cameraX, cameraY, cameraZ, 0, 0, 0, 0, 1, 0);
    mvpMatrix.multiply(modelMatrix);


    //normal matrix
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();

    gl.useProgram(program);
    // gl.depthMask(false);
    gl.uniform3f(program.u_LightPosition, lightX,lightY,lightZ);
    gl.uniform3f(program.u_ViewPosition, cameraX, cameraY, cameraZ);
    gl.uniform1f(program.u_Ka, 0.2);
    gl.uniform1f(program.u_Kd, 0.7);
    gl.uniform1f(program.u_Ks, 1.0);
    gl.uniform1f(program.u_shininess, 15.0);
    gl.uniform1i(program.u_Sampler, 0);
    gl.uniform1f(program.u_Alpha, 1.0);

    gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);
    gl.uniformMatrix4fv(program.u_modelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(program.u_normalMatrix, false, normalMatrix.elements);
    //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[tex]);
    for( let i=0; i < objComponents.length; i ++ ){
        initAttributeVariable(gl, program.a_Position, objComponents[i].vertexBuffer);
        initAttributeVariable(gl, program.a_TexCoord, objComponents[i].texCoordBuffer);
        initAttributeVariable(gl, program.a_Normal, objComponents[i].normalBuffer);
        gl.drawArrays(gl.TRIANGLES, 0, objComponents[i].numVertices);
    }
    // gl.depthMask(true);
}
function draw_Cube_off(objComponents,mx,my,mz,tex,vpMatrix){
    //model Matrix (part of the mvp matrix)
    modelMatrix.setIdentity();
    modelMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
    modelMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
    modelMatrix.scale(objScale, objScale, objScale);
    modelMatrix.translate(mx*2,my*2,mz*2);

    mvpMatrix.set(vpMatrix);
    mvpMatrix.multiply(modelMatrix);
    
    //normal matrix
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();

    gl.useProgram(program);

    gl.uniform3f(program.u_LightPosition, lightX,lightY,lightZ);
    gl.uniform3f(program.u_ViewPosition, cameraX2, cameraY2, cameraZ2);
    gl.uniform1f(program.u_Ka, 0.5);
    gl.uniform1f(program.u_Kd, 0.2);
    gl.uniform1f(program.u_Ks, 0.5);
    gl.uniform1f(program.u_shininess, 15.0);
    gl.uniform1i(program.u_Sampler, 0);
    gl.uniform1f(program.u_Alpha, 1.0);

    gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);
    gl.uniformMatrix4fv(program.u_modelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(program.u_normalMatrix, false, normalMatrix.elements);

    //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[tex]);
    for( let i=0; i < objComponents.length; i ++ ){
      initAttributeVariable(gl, program.a_Position, objComponents[i].vertexBuffer);
      initAttributeVariable(gl, program.a_TexCoord, objComponents[i].texCoordBuffer);
      initAttributeVariable(gl, program.a_Normal, objComponents[i].normalBuffer);
      gl.drawArrays(gl.TRIANGLES, 0, objComponents[i].numVertices);
    }
}
function draw_Cube(objComponents,mx,my,mz,tex){
        //model Matrix (part of the mvp matrix)
        modelMatrix.setIdentity();
        modelMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
        modelMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
        modelMatrix.scale(objScale, objScale, objScale);
        modelMatrix.translate(mx*2,my*2,mz*2);

        // modelMatrix.translate(0.0, 0.0, -1.0);
        // modelMatrix.scale(1.0, 0.5, 2.0);
        //mvp: projection * view * model matrix  
        mvpMatrix.setPerspective(30, 1, 1, 100);
        mvpMatrix.lookAt(cameraX, cameraY, cameraZ, 0, 0, 0, 0, 1, 0);
        mvpMatrix.multiply(modelMatrix);

    
        //normal matrix
        normalMatrix.setInverseOf(modelMatrix);
        normalMatrix.transpose();

        gl.useProgram(program);
    
        gl.uniform3f(program.u_LightPosition, lightX,lightY,lightZ);
        gl.uniform3f(program.u_ViewPosition, cameraX, cameraY, cameraZ);
        gl.uniform1f(program.u_Ka, 0.1);
        gl.uniform1f(program.u_Kd, 0.2);
        gl.uniform1f(program.u_Ks, 0.5);
        gl.uniform1f(program.u_shininess, 15.0);
        gl.uniform1i(program.u_Sampler, 0);
        gl.uniform1f(program.u_Alpha, 1.0);
    
        gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);
        gl.uniformMatrix4fv(program.u_modelMatrix, false, modelMatrix.elements);
        gl.uniformMatrix4fv(program.u_normalMatrix, false, normalMatrix.elements);
    
        //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textures[tex]);
        for( let i=0; i < objComponents.length; i ++ ){
          initAttributeVariable(gl, program.a_Position, objComponents[i].vertexBuffer);
          initAttributeVariable(gl, program.a_TexCoord, objComponents[i].texCoordBuffer);
          initAttributeVariable(gl, program.a_Normal, objComponents[i].normalBuffer);
          gl.drawArrays(gl.TRIANGLES, 0, objComponents[i].numVertices);
        }
}
function parsetexture(text, mtl) {
    let objCompImgIndex = [];
    const lines = text.split('\n');  // Split the text into lines
    
    lines.forEach(line => {
        const trimmedLine = line.trim();  // Trim whitespace from the line
        if (trimmedLine.startsWith('usemtl')) {  // Check if the line starts with "usemtl"
            const materialName = trimmedLine.split(' ')[1];  // Extract the material name
            if (mtl[materialName] && mtl[materialName].map_Kd) {
                // Check if the material exists and has a map_Kd property
                objCompImgIndex.push(mtl[materialName].map_Kd);  // Add the map_Kd to the array
            }
            else{
                //show error to the console
                console.error('Material not found:', materialName);
            }
        }
    });
    
    return objCompImgIndex;  // Return the array containing the map_Kd values
}
function draw_player(objComponents,mx,my,mz,cameraX,cameraY,cameraZ){
    gl.useProgram(program);
    modelMatrix.setIdentity();
    modelMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
    modelMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
    modelMatrix.translate((mx-0.5)*0.605,my*0.6-0.9,(mz-0.5)*0.605);

    modelMatrix.scale(0.05,0.05,0.05);

    mvpMatrix.setPerspective(30, 1, 1, 100);
    mvpMatrix.lookAt(cameraX, cameraY, cameraZ, 0, 0, 0, 0, 1, 0);
    mvpMatrix.multiply(modelMatrix);

    //normal matrix
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();

    gl.uniform3f(program.u_LightPosition, lightX,lightY,lightZ);
    gl.uniform3f(program.u_ViewPosition, cameraX, cameraY, cameraZ);
    gl.uniform1f(program.u_Ka, 0.5);
    gl.uniform1f(program.u_Kd, 0.7);
    gl.uniform1f(program.u_Ks, 1.0);
    gl.uniform1f(program.u_shininess, 15.0);
    gl.uniform1i(program.u_Sampler, 0);
    gl.uniform1f(program.u_Alpha, 1.0);

    gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);
    gl.uniformMatrix4fv(program.u_modelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(program.u_normalMatrix, false, normalMatrix.elements);

    for( let i=0; i < objComponents.length; i ++ ){
        //console.log('mtl:'+mtl)
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textures[objCompImgIndex[i]]);
        gl.uniform1i(program.u_Sampler, 0);
  
        initAttributeVariable(gl, program.a_Position, objComponents[i].vertexBuffer);
        initAttributeVariable(gl, program.a_TexCoord, objComponents[i].texCoordBuffer);
        initAttributeVariable(gl, program.a_Normal, objComponents[i].normalBuffer);
  
        gl.drawArrays(gl.TRIANGLES, 0, objComponents[i].numVertices);
      }
}
function draw_player_off(objComponents,mx,my,mz,vpMatrix){
    gl.useProgram(program);
    modelMatrix.setIdentity();
    modelMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
    modelMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
    modelMatrix.translate((mx-0.5)*0.605,my*0.6-0.9,(mz-0.5)*0.605);

    modelMatrix.scale(0.05,0.05,0.05);

    mvpMatrix.set(vpMatrix);
    mvpMatrix.multiply(modelMatrix);

    //normal matrix
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();

    gl.uniform3f(program.u_LightPosition, lightX,lightY,lightZ);
    gl.uniform3f(program.u_ViewPosition, cameraX, cameraY, cameraZ);
    gl.uniform1f(program.u_Ka, 0.5);
    gl.uniform1f(program.u_Kd, 0.7);
    gl.uniform1f(program.u_Ks, 1.0);
    gl.uniform1f(program.u_shininess, 15.0);
    gl.uniform1i(program.u_Sampler, 0);
    gl.uniform1f(program.u_Alpha, 1.0);

    gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);
    gl.uniformMatrix4fv(program.u_modelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(program.u_normalMatrix, false, normalMatrix.elements);

    for( let i=0; i < objComponents.length; i ++ ){
        //console.log('mtl:'+mtl)
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textures[objCompImgIndex[i]]);
        gl.uniform1i(program.u_Sampler, 0);
  
        initAttributeVariable(gl, program.a_Position, objComponents[i].vertexBuffer);
        initAttributeVariable(gl, program.a_TexCoord, objComponents[i].texCoordBuffer);
        initAttributeVariable(gl, program.a_Normal, objComponents[i].normalBuffer);
  
        gl.drawArrays(gl.TRIANGLES, 0, objComponents[i].numVertices);
      }
}
function draw(){
    // gl.clearColor(0,0,0,1);
    // draw_Env_Cube(cameraX,cameraY,cameraZ);
    
    idx = player.nowRoom;
    renderCubeMap(cameraX2,cameraY2,cameraZ2);
    gl.viewport(0, 0, canvas.width, canvas.height);


    var offset=2;
    var xsz = map[idx].xSize/2;
    var ysz = map[idx].ySize/2;
    for(let i = 0; i < map[idx].xSize; i++){
        for(let j = 0; j < map[idx].ySize; j++){
            for(let k = 1; k <= map[idx].field[i][j]; ++k){
                draw_Cube(cubeObj,i-xsz,k-offset,j-ysz,"brick");

            }
        }
    }
    for(let i = 0; i < map[idx].sightObj.length; ++i){
        draw_Cube(cubeObj, map[idx].sightObj[i].x-xsz,map[idx].sightObj[i].z-offset,map[idx].sightObj[i].y-ysz,"stone");
    }
    draw_rock(rockObj,lX,5,lZ,"rock",cameraX,cameraY,cameraZ);
    //console.log("x,y="+player.location.x+","+player.location.y)
    draw_player(playerObj, player.location.x-8, player.location.z, player.location.y-8,cameraX,cameraY,cameraZ );
   
    for(let i = 0; i < 5; i++){
        draw_Cube(cubeObj,-1,-1,i,"stone");
    }
    // gl.clearColor(0,0,0,1);
    // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    let rotateMatrix = new Matrix4();
    rotateMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
    rotateMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
    var viewDir= new Vector3([cameraDirX, cameraDirY, cameraDirZ]);
    var newViewDir = rotateMatrix.multiplyVector3(viewDir);
    let vpMatrix = new Matrix4();
    vpMatrix.setPerspective(90, 1, 1, 100);
    vpMatrix.lookAt(cameraX, cameraY, cameraZ,
        cameraX + newViewDir.elements[0],
        cameraY + newViewDir.elements[1],
        cameraZ + newViewDir.elements[2],
        0, 1, 0);
//         vpMatrix.elements[12] = 0; //ignore translation
//   vpMatrix.elements[13] = 0;
//   vpMatrix.elements[14] = 0;
      //the sphere
    let mdlMatrix = new Matrix4();
    mdlMatrix.setIdentity();
    mdlMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
    mdlMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
    mdlMatrix.scale(objScale, objScale, objScale);
    mdlMatrix.translate(-lX*2,7,lZ*2);
    //mdlMatrix.setScale(0.5, 0.5, 0.5);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    vpMatrix.setPerspective(30, 1, 1, 100);
    vpMatrix.lookAt(cameraX, cameraY, cameraZ, 0, 0, 0, 0, 1, 0);
    drawObjectWithDynamicReflection(sphereObj, mdlMatrix, vpMatrix, 0.95, 0.85, 0.4);

    draw_Env_Cube(cameraX,cameraY,cameraZ);

}

function drawObjectWithDynamicReflection(obj, modelMatrix, vpMatrix, colorR, colorG, colorB){
    gl.useProgram(programTextureOnCube);
    let mvpMatrix = new Matrix4();
    let normalMatrix = new Matrix4();
    mvpMatrix.set(vpMatrix);
    mvpMatrix.multiply(modelMatrix);
  
    //normal matrix
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
  
    gl.uniform3f(programTextureOnCube.u_ViewPosition, cameraX, cameraY, cameraZ);
    gl.uniform3f(programTextureOnCube.u_Color, colorR, colorG, colorB);
  
    gl.uniformMatrix4fv(programTextureOnCube.u_MvpMatrix, false, mvpMatrix.elements);
    gl.uniformMatrix4fv(programTextureOnCube.u_modelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(programTextureOnCube.u_normalMatrix, false, normalMatrix.elements);
  
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, fbo.texture);
    gl.uniform1i(programTextureOnCube.u_envCubeMap, 0);
  
    for( let i=0; i < obj.length; i ++ ){
      initAttributeVariable(gl, programTextureOnCube.a_Position, obj[i].vertexBuffer);
      initAttributeVariable(gl, programTextureOnCube.a_Normal, obj[i].normalBuffer);
      gl.drawArrays(gl.TRIANGLES, 0, obj[i].numVertices);
    }
  }
function drawoffscreen(vpMatrix){
    //gl.clearColor(0,0,0,1);
    gl.enable(gl.DEPTH_TEST);
    idx = player.nowRoom;
    gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
    draw_Env_Cube(cameraX2,cameraY2,cameraZ2,null);
    var offset=2;
    var xsz = map[idx].xSize/2;
    var ysz = map[idx].ySize/2;
    for(let i = 0; i < map[idx].xSize; i++){
        for(let j = 0; j < map[idx].ySize; j++){
            for(let k = 1; k <= map[idx].field[i][j]; ++k){
                draw_Cube_off(cubeObj,i-xsz,k-offset,j-ysz,"brick",vpMatrix);

            }
        }
    }
    for(let i = 0; i < map[idx].sightObj.length; ++i){
        draw_Cube_off(cubeObj, map[idx].sightObj[i].x-xsz,map[idx].sightObj[i].z-offset,map[idx].sightObj[i].y-ysz,"stone",vpMatrix);
    }
    draw_rock_off(rockObj,lX,5,lZ,"rock",vpMatrix);
    //console.log("x,y="+player.location.x+","+player.location.y)
    draw_player_off(playerObj, player.location.x-8, player.location.z, player.location.y-8,vpMatrix);

}

function parseOBJ(text) {
    // because indices are base 1 let's just fill in the 0th data
    const objPositions = [[0, 0, 0]];
    const objTexcoords = [[0, 0]];
    const objNormals = [[0, 0, 0]];

    // same order as `f` indices
    const objVertexData = [
        objPositions,
        objTexcoords,
        objNormals,
    ];

    // same order as `f` indices
    let webglVertexData = [
        [],   // positions
        [],   // texcoords
        [],   // normals
    ];

    const materialLibs = [];
    const geometries = [];
    let geometry;
    let groups = ['default'];
    let material = 'default';
    let object = 'default';

    const noop = () => { };

    function newGeometry() {
        // If there is an existing geometry and it's
        // not empty then start a new one.
        if (geometry && geometry.data.position.length) {
            geometry = undefined;
        }
    }

    function setGeometry() {
        if (!geometry) {
            const position = [];
            const texcoord = [];
            const normal = [];
            webglVertexData = [
                position,
                texcoord,
                normal,
            ];
            geometry = {
                object,
                groups,
                material,
                data: {
                    position,
                    texcoord,
                    normal,
                },
            };
            geometries.push(geometry);
        }
    }

    function addVertex(vert) {
        const ptn = vert.split('/');
        ptn.forEach((objIndexStr, i) => {
            if (!objIndexStr) {
                return;
            }
            const objIndex = parseInt(objIndexStr);
            const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
            webglVertexData[i].push(...objVertexData[i][index]);
        });
    }

    const keywords = {
        v(parts) {
            objPositions.push(parts.map(parseFloat));
        },
        vn(parts) {
            objNormals.push(parts.map(parseFloat));
        },
        vt(parts) {
            // should check for missing v and extra w?
            // console.log(text)
            // if (text == './Coffin.obj')
            //     console.log(parts.map(parseFloat))
            objTexcoords.push(parts.map(parseFloat));
        },
        f(parts) {
            setGeometry();
            const numTriangles = parts.length - 2;
            for (let tri = 0; tri < numTriangles; ++tri) {
                addVertex(parts[0]);
                addVertex(parts[tri + 1]);
                addVertex(parts[tri + 2]);
            }
        },
        s: noop,    // smoothing group
        mtllib(parts, unparsedArgs) {
            // the spec says there can be multiple filenames here
            // but many exist with spaces in a single filename
            materialLibs.push(unparsedArgs);
        },
        usemtl(parts, unparsedArgs) {
            material = unparsedArgs;
            newGeometry();
        },
        g(parts) {
            groups = parts;
            newGeometry();
        },
        o(parts, unparsedArgs) {
            object = unparsedArgs;
            newGeometry();
        },
    };

    const keywordRE = /(\w*)(?: )*(.*)/;
    const lines = text.split('\n');
    for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
        const line = lines[lineNo].trim();
        if (line === '' || line.startsWith('#')) {
            continue;
        }
        const m = keywordRE.exec(line);
        if (!m) {
            continue;
        }
        const [, keyword, unparsedArgs] = m;
        const parts = line.split(/\s+/).slice(1);
        const handler = keywords[keyword];
        if (!handler) {
            console.warn('unhandled keyword:', keyword);  // eslint-disable-line no-console
            continue;
        }
        handler(parts, unparsedArgs);
    }

    // remove any arrays that have no entries.
    for (const geometry of geometries) {
        geometry.data = Object.fromEntries(
            Object.entries(geometry.data).filter(([, array]) => array.length > 0));
    }

    return {
        geometries,
        materialLibs,
    };
}
function parseMTL(text) {
    const materials = {};
    let currentMaterial = null;
    
    const lines = text.split('\n');
    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('#') || line === '') {
            continue; // Skip comments and empty lines
        }
    
        const parts = line.split(/\s+/);
        const keyword = parts[0];
    
        switch (keyword) {
            case 'newmtl': // New material
                currentMaterial = parts[1];
                materials[currentMaterial] = {
                    Ka: [1, 1, 1], // Ambient color default to white
                    Kd: [1, 1, 1], // Diffuse color default to white
                    Ks: [1, 1, 1], // Specular color default to white
                    Ns: 0,         // Specular exponent default to 0
                    map_Kd: null   // Diffuse texture map
                };
                break;
            case 'Ka': // Ambient color
                materials[currentMaterial].Ka = parts.slice(1).map(Number);
                break;
            case 'Kd': // Diffuse color
                materials[currentMaterial].Kd = parts.slice(1).map(Number);
                break;
            case 'Ks': // Specular color
                materials[currentMaterial].Ks = parts.slice(1).map(Number);
                break;
            case 'Ns': // Specular exponent
                materials[currentMaterial].Ns = parseFloat(parts[1]);
                break;
            case 'map_Kd': // Diffuse texture map
                // Assuming the texture file is directly available or correctly pathed
                materials[currentMaterial].map_Kd = parts[1];
                break;
        }
    }
    
    return materials;
}

function mouseUp(ev) {
    mouseDragging = false;
}

function mouseMove(ev) {
    var x = ev.clientX;
    var y = ev.clientY;
    if (mouseDragging) {
        var factor = 100 / canvas.height; //100 determine the spped you rotate the object
        var dx = factor * (x - mouseLastX);
        var dy = factor * (y - mouseLastY);

        angleX += dx; //yes, x for y, y for x, this is right
        angleY += dy;
    }
    mouseLastX = x;
    mouseLastY = y;

    draw();
}
function moveForward(distance) {
    //cameraZ += distance * Math.cos(angleX * Math.PI / 180);
    //cameraX += distance * Math.sin(angleX * Math.PI / 180);
    cameraX += distance 
    cameraZ +=distance*3
}

function moveBackward(distance) {
    //cameraZ -= distance * Math.cos(angleX * Math.PI / 180);
    //cameraX -= distance * Math.sin(angleX * Math.PI / 180);
    cameraX-=distance;
    cameraZ-=distance*3
}

function moveLeft(distance) {
    //cameraX -= distance * Math.cos(angleX * Math.PI / 180);
    //cameraZ += distance * Math.sin(angleX * Math.PI / 180);
    cameraX-=distance;
    cameraZ-=distance*3;
}

function moveRight(distance) {
    //cameraX += distance * Math.cos(angleX * Math.PI / 180);
    //cameraZ -= distance * Math.sin(angleX * Math.PI / 180);
    cameraX+=distance;
    cameraZ+=distance*3;
}

function scroll(ev) {
    // console.log(ev.wheelDelta)
    if (ev.wheelDelta < 0) {
        cameraX += 0.3;
        cameraY += 0.3;
        cameraZ += 0.7;
        // ++cameradis;
    } else {
        cameraX -= 0.3;
        cameraY -= 0.3;
        cameraZ -= 0.7;
        // --cameradis;
    }
}
function draw_Env_Cube(cameraX,cameraY,cameraZ,vpFromCamera){
    gl.enable(gl.DEPTH_TEST);
    
    let rotateMatrix = new Matrix4();
    rotateMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
    rotateMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
    var viewDir= new Vector3([cameraDirX, cameraDirY, cameraDirZ]);
    var newViewDir = rotateMatrix.multiplyVector3(viewDir);
     vpFromCamera = new Matrix4();
    //var vpFromCamera = new Matrix4();
    vpFromCamera.setPerspective(60, 1, 1, 15);
    var viewMatrixRotationOnly = new Matrix4();
    viewMatrixRotationOnly.lookAt(cameraX, cameraY, cameraZ, 
                                  cameraX + newViewDir.elements[0], 
                                  cameraY + newViewDir.elements[1], 
                                  cameraZ + newViewDir.elements[2], 
                                  0, 1, 0);
    viewMatrixRotationOnly.elements[12] = 0; //ignore translation
    viewMatrixRotationOnly.elements[13] = 0;
    viewMatrixRotationOnly.elements[14] = 0;
    vpFromCamera.multiply(viewMatrixRotationOnly);
    var vpFromCameraInverse = vpFromCamera.invert();
    gl.useProgram(programEnvCube);
    gl.depthFunc(gl.LEQUAL);
    gl.uniformMatrix4fv(programEnvCube.u_viewDirectionProjectionInverse, 
                        false, vpFromCameraInverse.elements);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTex);
    gl.uniform1i(programEnvCube.u_envCubeMap, 0);
    initAttributeVariable(gl, programEnvCube.a_Position, quadObj.vertexBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, quadObj.numVertices);
  }
