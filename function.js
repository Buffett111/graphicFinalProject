function initCubeTexture(posXName, negXName, posYName, negYName,
    posZName, negZName, imgWidth, imgHeight) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

    const faceInfos = [
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            fName: posXName,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            fName: negXName,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            fName: posYName,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            fName: negYName,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            fName: posZName,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
            fName: negZName,
        },
    ];
    faceInfos.forEach((faceInfo) => {
        const { target, fName } = faceInfo;
        // setup each face so it's immediately renderable
        gl.texImage2D(target, 0, gl.RGBA, imgWidth, imgHeight, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, null);

        var image = new Image();
        image.onload = function () {
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
            gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        };
        image.src = fName;
    });
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

    return texture;
}

async function loadOBJtoCreateVBO(objFile) {
    let objComponents = [];
    response = await fetch(objFile);
    text = await response.text();
    obj = parseOBJ(text);
    for (let i = 0; i < obj.geometries.length; i++) {
        let o = initVertexBufferForLaterUse(gl,
            obj.geometries[i].data.position,
            obj.geometries[i].data.normal,
            obj.geometries[i].data.texcoord);
        objComponents.push(o);
    }
    return objComponents;
}

function initFrameBufferForCubemapRendering(gl) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

    // 6 2D textures
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    for (let i = 0; i < 6; i++) {
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0,
            gl.RGBA, offScreenWidth, offScreenHeight, 0, gl.RGBA,
            gl.UNSIGNED_BYTE, null);
    }

    //create and setup a render buffer as the depth buffer
    var depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16,
        offScreenWidth, offScreenHeight);

    //create and setup framebuffer: linke the depth buffer to it (no color buffer here)
    var frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
        gl.RENDERBUFFER, depthBuffer);

    frameBuffer.texture = texture;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return frameBuffer;
}

function renderCubeMap(camX, camY, camZ) {
    //camera 6 direction to render 6 cubemap faces
    var ENV_CUBE_LOOK_DIR = [
        [1.0, 0.0, 0.0],
        [-1.0, 0.0, 0.0],
        [0.0, 1.0, 0.0],
        [0.0, -1.0, 0.0],
        [0.0, 0.0, 1.0],
        [0.0, 0.0, -1.0]
    ];

    //camera 6 look up vector to render 6 cubemap faces
    var ENV_CUBE_LOOK_UP = [
        [0.0, -1.0, 0.0],
        [0.0, -1.0, 0.0],
        [0.0, 0.0, 1.0],
        [0.0, 0.0, -1.0],
        [0.0, -1.0, 0.0],
        [0.0, -1.0, 0.0]
    ];

    gl.useProgram(program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, offScreenWidth, offScreenHeight);
    gl.clearColor(0.4, 0.4, 0.4, 1);
    for (var side = 0; side < 6; side++) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_CUBE_MAP_POSITIVE_X + side, fbo.texture, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        let vpMatrix = new Matrix4();
        vpMatrix.setPerspective(90, 1, 1, 100);
        vpMatrix.lookAt(camX, camY, camZ,
            camX + ENV_CUBE_LOOK_DIR[side][0],
            camY + ENV_CUBE_LOOK_DIR[side][1],
            camZ + ENV_CUBE_LOOK_DIR[side][2],
            ENV_CUBE_LOOK_UP[side][0],
            ENV_CUBE_LOOK_UP[side][1],
            ENV_CUBE_LOOK_UP[side][2]);

        drawRegularObjects(vpMatrix);
        ///////////////////////////////////////////////////////////
        gl.useProgram(programEnvCube);
        var vpFromCameraInverse = vpMatrix.invert();
        gl.uniformMatrix4fv(programEnvCube.u_viewDirectionProjectionInverse,
            false, vpFromCameraInverse.elements);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTex);
        gl.uniform1i(programEnvCube.u_envCubeMap, 0);
        initAttributeVariable(gl, programEnvCube.a_Position, quadObj.vertexBuffer);
        gl.drawArrays(gl.TRIANGLES, 0, quadObj.numVertices);


    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
/////BEGIN:///////////////////////////////////////////////////////////////////////////////////////////////
/////The folloing three function is for creating vertex buffer, but link to shader to user later//////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////
function initAttributeVariable(gl, a_attribute, buffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute);
}

function initArrayBufferForLaterUse(gl, data, num, type) {
    // Create a buffer object
    var buffer = gl.createBuffer();
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return null;
    }
    // Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    // Store the necessary information to assign the object to the attribute variable later
    buffer.num = num;
    buffer.type = type;

    return buffer;
}

function initVertexBufferForLaterUse(gl, vertices, normals, texCoords) {
    var nVertices = vertices.length / 3;

    var o = new Object();
    o.vertexBuffer = initArrayBufferForLaterUse(gl, new Float32Array(vertices), 3, gl.FLOAT);
    if (normals != null) o.normalBuffer = initArrayBufferForLaterUse(gl, new Float32Array(normals), 3, gl.FLOAT);
    if (texCoords != null) o.texCoordBuffer = initArrayBufferForLaterUse(gl, new Float32Array(texCoords), 2, gl.FLOAT);
    //you can have error check here
    o.numVertices = nVertices;

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return o;
}
/////END://///////////////////////////////////////////////////////////////////////////////////////////////
/////The folloing three function is for creating vertex buffer, but link to shader to user later//////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////