/*global CANNON, THREE, $t, requestAnimationFrame, teal */

"use strict";

(function() {

    var randomStorage = [], useRandomStorage = true;

    function createShape(vertices, faces, radius) {
        var cv = [], cf = [];
        for (var i = 0; i < vertices.length; ++i) {
            var v = vertices[i];
            var l = radius / Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
            cv.push(new CANNON.Vec3(v[0] * l, v[1] * l, v[2] * l));
        }
        for (var i = 0; i < faces.length; ++i) {
            cf.push(faces[i].slice(0, faces[i].length - 1));
        }
        return new CANNON.ConvexPolyhedron(cv, cf);
    }

    function makeGeom(vertices, faces, radius, tab, af) {
        var geom = new THREE.Geometry();
        for (var i = 0; i < vertices.length; ++i) {
            var vertex = (new THREE.Vector3()).fromArray(vertices[i]).normalize().multiplyScalar(radius);
            vertex.index = geom.vertices.push(vertex) - 1;
        }
        for (var i = 0; i < faces.length; ++i) {
            var ii = faces[i], fl = ii.length - 1;
            var aa = Math.PI * 2 / fl;
            for (var j = 0; j < fl - 2; ++j) {
                geom.faces.push(new THREE.Face3(ii[0], ii[j + 1], ii[j + 2], [geom.vertices[ii[0]],
                                                                              geom.vertices[ii[j + 1]], geom.vertices[ii[j + 2]]], 0, ii[fl] + 1));
                geom.faceVertexUvs[0].push([
                    new THREE.Vector2((Math.cos(af) + 1 + tab) / 2 / (1 + tab),
                                      (Math.sin(af) + 1 + tab) / 2 / (1 + tab)),
                    new THREE.Vector2((Math.cos(aa * (j + 1) + af) + 1 + tab) / 2 / (1 + tab),
                                      (Math.sin(aa * (j + 1) + af) + 1 + tab) / 2 / (1 + tab)),
                    new THREE.Vector2((Math.cos(aa * (j + 2) + af) + 1 + tab) / 2 / (1 + tab),
                                      (Math.sin(aa * (j + 2) + af) + 1 + tab) / 2 / (1 + tab))]);
            }
        }
        geom.computeFaceNormals();
        geom.computeVertexNormals();
        geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius);
        return geom;
    }

    function createDieGeom(vertices, faces, radius, tab, af) {
        var geom = makeGeom(vertices, faces, radius, tab, af);
        geom.cannonShape = createShape(vertices, faces, radius);
        return geom;
    }

    var d20Labels = [' ', '0', '1', '2', '3', '4', '5', '6', '7', '8',
                     '9', '10', '11', '12', '13', '14', '15', '16', '17',
                     '18', '19', '20'];
    var d100Labels = [' ', '00', '10', '20', '30', '40', '50',
                      '60', '70', '80', '90'];

    function createDieMaterials(type, labelColor, dieColor) {
        if (type === 'd4') {
            return createD4Materials(scale / 2, scale * 2,
                                     labelColor,
                                     dieColor);
        } else {
            return _createDieMaterials(dieInfo[type].labels,
                                       scale * dieInfo[type].marginFactor,
                                       labelColor,
                                       dieColor);
        }
    }

    function _createDieMaterials(faceLabels, margin, labelColor, dieColor) {
        function createTextTexture(text, labelColor, dieColor) {
            if (text === undefined) {
                return null;
            }
            var canvas = document.createElement("canvas");
            var context = canvas.getContext("2d");
            var size = scale / 2;
            canvas.width = size + margin;
            canvas.height = size + margin;
            context.font = size + "pt Arial";
            context.fillStyle = dieColor;
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillStyle = labelColor;
            context.fillText(text, canvas.width / 2, canvas.height / 2);
            if (text === '6' || text === '9') {
                context.fillText('  .', canvas.width / 2, canvas.height / 2);
            }
            var texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
            return texture;
        }
        var materials = [];
        for (var i = 0; i < faceLabels.length; ++i) {
            materials.push(
                new THREE.MeshPhongMaterial(
                    $t.copyto(materialOptions,
                              {map: createTextTexture(faceLabels[i],
                                                      labelColor,
                                                      dieColor)})
                )
            );
        }
        return materials;
    }

    function createD4Materials(size, margin, labelColor, dieColor) {
        function createD4Text(text, labelColor, dieColor) {
            var canvas = document.createElement("canvas");
            var context = canvas.getContext("2d");
            canvas.width = size + margin;
            canvas.height = size + margin;
            context.font = size + "pt Arial";
            context.fillStyle = dieColor;
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillStyle = labelColor;
            context.translate(0, size / 10);
            for (var i in text) {
                context.fillText(text[i], canvas.width / 2,
                                 canvas.height / 2 - size - margin / 10);
                context.translate(canvas.width / 2, canvas.height / 2);
                context.rotate(Math.PI * 2 / 3);
                context.translate(-canvas.width / 2, -canvas.height / 2);
            }
            var texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
            return texture;
        }
        var materials = [];
        var labels = [[], [0, 0, 0], [2, 4, 3], [1, 3, 4], [2, 1, 4], [1, 2, 3]];
        for (var i = 0; i < labels.length; ++i) {
            materials.push(new THREE.MeshPhongMaterial($t.copyto(materialOptions,
                                                                 { map: createD4Text(labels[i], labelColor, dieColor) })));
        }
        return materials;
    }

    function createDieGeometry(type, radius) {
        var geometryCreators = {
            d4: createD4Geometry,
            d6: createD6Geometry,
            d8: createD8Geometry,
            d10: createD10Geometry,
            d12: createD12Geometry,
            d20: createD20Geometry,
            d100: createD10Geometry
        };

        return geometryCreators[type](radius);
    }

    function createD4Geometry(radius) {
        var vertices = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]];
        var faces = [[1, 0, 2, 1], [0, 1, 3, 2], [0, 3, 2, 3], [1, 2, 3, 4]];
        return createDieGeom(vertices, faces, radius, -0.1, Math.PI * 7 / 6);
    }

    function createD6Geometry(radius) {
        var vertices = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
                        [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
        var faces = [[0, 3, 2, 1, 1], [1, 2, 6, 5, 2], [0, 1, 5, 4, 3],
                     [3, 7, 6, 2, 4], [0, 4, 7, 3, 5], [4, 5, 6, 7, 6]];
        return createDieGeom(vertices, faces, radius, 0.1, Math.PI / 4);
    }

    function createD8Geometry(radius) {
        var vertices = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
        var faces = [[0, 2, 4, 1], [0, 4, 3, 2], [0, 3, 5, 3], [0, 5, 2, 4], [1, 3, 4, 5],
                     [1, 4, 2, 6], [1, 2, 5, 7], [1, 5, 3, 8]];
        return createDieGeom(vertices, faces, radius, 0, -Math.PI / 4 / 2);
    }

    function createD10Geometry(radius) {
        var a = Math.PI * 2 / 10,
            h = 0.105,
            v = -1;
        var vertices = [];
        for (var i = 0, b = 0; i < 10; ++i, b += a) {
            vertices.push([Math.cos(b), Math.sin(b), h * (i % 2 ? 1 : -1)]);
        }
        vertices.push([0, 0, -1]); vertices.push([0, 0, 1]);
        var faces = [[5, 7, 11, 0], [4, 2, 10, 1], [1, 3, 11, 2], [0, 8, 10, 3], [7, 9, 11, 4],
                     [8, 6, 10, 5], [9, 1, 11, 6], [2, 0, 10, 7], [3, 5, 11, 8], [6, 4, 10, 9],
                     [1, 0, 2, v], [1, 2, 3, v], [3, 2, 4, v], [3, 4, 5, v], [5, 4, 6, v],
                     [5, 6, 7, v], [7, 6, 8, v], [7, 8, 9, v], [9, 8, 0, v], [9, 0, 1, v]];
        return createDieGeom(vertices, faces, radius, 0, Math.PI * 6 / 5);
    }

    function createD12Geometry(radius) {
        var p = (1 + Math.sqrt(5)) / 2, q = 1 / p;
        var vertices = [[0, q, p], [0, q, -p], [0, -q, p], [0, -q, -p], [p, 0, q],
                        [p, 0, -q], [-p, 0, q], [-p, 0, -q], [q, p, 0], [q, -p, 0], [-q, p, 0],
                        [-q, -p, 0], [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1], [-1, 1, 1],
                        [-1, 1, -1], [-1, -1, 1], [-1, -1, -1]];
        var faces = [[2, 14, 4, 12, 0, 1], [15, 9, 11, 19, 3, 2], [16, 10, 17, 7, 6, 3], [6, 7, 19, 11, 18, 4],
                     [6, 18, 2, 0, 16, 5], [18, 11, 9, 14, 2, 6], [1, 17, 10, 8, 13, 7], [1, 13, 5, 15, 3, 8],
                     [13, 8, 12, 4, 5, 9], [5, 4, 14, 9, 15, 10], [0, 12, 8, 10, 16, 11], [3, 19, 7, 17, 1, 12]];
        return createDieGeom(vertices, faces, radius, 0.2, -Math.PI / 4 / 2);
    }

    function createD20Geometry(radius) {
        var t = (1 + Math.sqrt(5)) / 2;
        var vertices = [[-1, t, 0], [1, t, 0 ], [-1, -t, 0], [1, -t, 0],
                        [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
                        [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
        var faces = [[0, 11, 5, 1], [0, 5, 1, 2], [0, 1, 7, 3], [0, 7, 10, 4], [0, 10, 11, 5],
                     [1, 5, 9, 6], [5, 11, 4, 7], [11, 10, 2, 8], [10, 7, 6, 9], [7, 1, 8, 10],
                     [3, 9, 4, 11], [3, 4, 2, 12], [3, 2, 6, 13], [3, 6, 8, 14], [3, 8, 9, 15],
                     [4, 9, 5, 16], [2, 4, 11, 17], [6, 2, 10, 18], [8, 6, 7, 19], [9, 8, 1, 20]];
        return createDieGeom(vertices, faces, radius, -0.2, -Math.PI / 4 / 2);
    }

    var scale = 50;
    var materialOptions = {
        specular: '#171d1f',
        color: '#ffffff',
        emissive: '#000000',
        shininess: 70,
        shading: THREE.FlatShading
    };
    var defaultLabelColor = '#aaaaaa';
    var defaultDieColor = '#202020';
    var knownDieTypes = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];

    var dieInfo = {
        d4: {mass: 300, inertia: 5, radiusFactor: 1.2, marginFactor: null},
        d6: {mass: 300, inertia: 13, radiusFactor: 0.9, marginFactor: 1,
             labels: d20Labels},
        d8: {mass: 340, inertia: 10, radiusFactor: 1, marginFactor: 1,
             labels: d20Labels},
        d10: {mass: 340, inertia: 10, radiusFactor: 0.9, marginFactor: 1,
              labels: d20Labels},
        d12: {mass: 340, inertia: 10, radiusFactor: 0.9, marginFactor: 1,
              labels: d20Labels},
        d20: {mass: 340, inertia: 10, radiusFactor: 1, marginFactor: 1,
              labels: d20Labels},
        d100: {mass: 340, inertia: 10, radiusFactor: 0.9, marginFactor: 1.5,
               labels: d100Labels}
    };
    var dieMaterialCache = {}, dieGeometryCache = {};

    function dieSignature(type, dieColor, labelColor) {
        return dieInfo[type].labels + dieColor + labelColor;
    }

    function createDie(type, labelColor, dieColor) {
        labelColor = labelColor || defaultLabelColor;
        dieColor = dieColor || defaultDieColor;

        if (!dieGeometryCache[type]) {
            dieGeometryCache[type] = createDieGeometry(
                type,
                scale * dieInfo[type].radiusFactor
            );
        }

        var dieSig = dieSignature(type, dieColor, labelColor);
        if (!dieMaterialCache[dieSig]) {
            dieMaterialCache[dieSig] = new THREE.MeshFaceMaterial(
                createDieMaterials(type, labelColor, dieColor)
            );
        }
        var die = new THREE.Mesh(dieGeometryCache[type],
                                 dieMaterialCache[dieSig]);
        die.castShadow = true;
        die.userData = {type: type,
                        labelColor: labelColor,
                        dieColor: dieColor};
        return die;
    }

    this.parseNotation = function(notation) {
        var dr = /\s*(\d*)([a-z]+)(\d+)(\s*\+\s*(\d+)){0,1}\s*(\+|$)/gi;
        var ret = { set: [], constant: 0 }, res;
        while ((res = dr.exec(notation))) {
            var command = res[2];
            if (command !== 'd') {
                continue;
            }
            var count = parseInt(res[1], 10);
            if (res[1] === '') {
                count = 1;
            }
            var type = 'd' + res[3];
            if (knownDieTypes.indexOf(type) === -1) {
                continue;
            }
            while (count--) {
                ret.set.push(type);
            }
            if (res[5]) {
                ret.constant += parseInt(res[5], 10);
            }
        }
        return ret;
    };

    this.stringifyNotation = function(nn) {
        var dict = {}, notation = '';
        for (var i in nn.set) {
            if (!dict[nn.set[i].type]) {
                dict[nn.set[i].type] = 1;
            } else {
                ++dict[nn.set[i].type];
            }
        }
        for (var i in dict) {
            if (notation.length) {
                notation += ' + ';
            }
            notation += dict[i] + i;
        }
        if (nn.constant) {
            notation += ' + ' + nn.constant;
        }
        return notation;
    };

    this.dieBox = function(container, dimensions) {
        this.cw = container.clientWidth / 2;
        this.ch = container.clientHeight / 2;
        if (dimensions) {
            this.w = dimensions.w;
            this.h = dimensions.h;
        }
        else {
            this.w = this.cw;
            this.h = this.ch;
        }
        this.aspect = Math.min(this.cw / this.w, this.ch / this.h);
        scale = Math.sqrt(this.w * this.w + this.h * this.h) / 13;
        this.useAdaptiveTimestep = true;

        this.renderer = window.WebGLRenderingContext ?
            new THREE.WebGLRenderer({ antialias: true }) :
            new THREE.CanvasRenderer({ antialias: true });
        this.renderer.setSize(this.cw * 2, this.ch * 2);
        this.renderer.shadowMapEnabled = true;
        this.renderer.shadowMapSoft = true;
        this.renderer.setClearColor(0xffffff, 1);

        this.dice = [];
        this.scene = new THREE.Scene();
        this.world = new CANNON.World();

        container.appendChild(this.renderer.domElement);

        this.world.gravity.set(0, 0, -9.8 * 800);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 8;

        var wh = Math.min(this.cw, this.ch) / this.aspect / Math.tan(10 * Math.PI / 180);
        this.camera = new THREE.PerspectiveCamera(20, this.cw / this.ch, 1, wh * 1.3);
        this.camera.position.z = wh;

        var ambientLight = new THREE.AmbientLight(0xf0f0f0);
        this.scene.add(ambientLight);
        var mw = Math.max(this.w, this.h);
        var light = new THREE.SpotLight(0xf0f0f0);
        light.position.set(-mw * 2, mw / 2, mw * 2);
        light.target.position.set(0, 0, 0);
        light.castShadow = true;
        light.shadowCameraNear = mw / 10;
        light.shadowCameraFar = mw * 3;
        light.shadowCameraFov = 50;
        light.shadowBias = 0.001;
        light.shadowDarkness = 0.3;
        light.shadowMapWidth = 1024;
        light.shadowMapHeight = 1024;
        this.scene.add(light);

        this.dieBodyMaterial = new CANNON.Material();
        var deskBodyMaterial = new CANNON.Material();
        var barrierBodyMaterial = new CANNON.Material();
        this.world.addContactMaterial(new CANNON.ContactMaterial(
            deskBodyMaterial, this.dieBodyMaterial, 0.01, 0.5));
        this.world.addContactMaterial(new CANNON.ContactMaterial(
            barrierBodyMaterial, this.dieBodyMaterial, 0, 1.0));
        this.world.addContactMaterial(new CANNON.ContactMaterial(
            this.dieBodyMaterial, this.dieBodyMaterial, 0, 0.5));

        this.desk = new THREE.Mesh(new THREE.PlaneGeometry(this.w * 2, this.h * 2, 1, 1), 
                                   new THREE.MeshLambertMaterial({ color: 0xffffff }));
        this.desk.receiveShadow = true;
        this.scene.add(this.desk);

        this.world.add(new CANNON.RigidBody(0, new CANNON.Plane(), deskBodyMaterial));
        var barrier;
        barrier = new CANNON.RigidBody(0, new CANNON.Plane(), barrierBodyMaterial);
        barrier.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
        barrier.position.set(0, this.h * 0.93, 0);
        this.world.add(barrier);

        barrier = new CANNON.RigidBody(0, new CANNON.Plane(), barrierBodyMaterial);
        barrier.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        barrier.position.set(0, -this.h * 0.93, 0);
        this.world.add(barrier);

        barrier = new CANNON.RigidBody(0, new CANNON.Plane(), barrierBodyMaterial);
        barrier.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 2);
        barrier.position.set(this.w * 0.93, 0, 0);
        this.world.add(barrier);

        barrier = new CANNON.RigidBody(0, new CANNON.Plane(), barrierBodyMaterial);
        barrier.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
        barrier.position.set(-this.w * 0.93, 0, 0);
        this.world.add(barrier);

        this.lastTime = 0;
        this.running = false;

        this.renderer.render(this.scene, this.camera);
    };

    this.dieBox.prototype.createDie = function(type, pos, velocity, angle, axis, labelColor, color) {
        var die = createDie(type, labelColor, color);
        die.dieType = type;
        die.body = new CANNON.RigidBody(dieInfo[type].mass,
                                        die.geometry.cannonShape, this.dieBodyMaterial);
        die.body.position.set(pos.x, pos.y, pos.z);
        die.body.quaternion.setFromAxisAngle(new CANNON.Vec3(axis.x, axis.y, axis.z), axis.a * Math.PI * 2);
        die.body.angularVelocity.set(angle.x, angle.y, angle.z);
        die.body.velocity.set(velocity.x, velocity.y, velocity.z);
        die.body.linearDamping = 0.1;
        die.body.angularDamping = 0.1;
        this.scene.add(die);
        this.dice.push(die);
        this.world.add(die.body);
    };

    this.dieBox.prototype.check = function() {
        var res = true;
        var e = 6;
        var time = (new Date()).getTime();
        if (time - this.running < 10000) {
            for (var i = 0; i < this.dice.length; ++i) {
                var dice = this.dice[i];
                if (dice.diceStopped === true) {
                    continue;
                }
                var a = dice.body.angularVelocity, v = dice.body.velocity;
                if (Math.abs(a.x) < e && Math.abs(a.y) < e && Math.abs(a.z) < e &&
                    Math.abs(v.x) < e && Math.abs(v.y) < e && Math.abs(v.z) < e) {
                    if (dice.diceStopped) {
                        if (time - dice.diceStopped > 50) {
                            dice.diceStopped = true;
                            continue;
                        }
                    } else {
                        dice.diceStopped = (new Date()).getTime();
                    }
                    res = false;
                } else {
                    dice.diceStopped = undefined;
                    res = false;

                }
            }
        }
        if (res) {
            this.running = false;
            var values = [];
            for (var i in this.dice) {
                var dice = this.dice[i],
                    invert = dice.dieType === 'd4' ? -1 : 1;
                var intersects = (new THREE.Raycaster(
                    new THREE.Vector3(dice.position.x, dice.position.y, 200 * invert),
                    new THREE.Vector3(0, 0, -1 * invert))).intersectObjects([dice]);
                var matindex = intersects[0].face.materialIndex - 1;
                if (dice.dieType === 'd100') {
                    matindex *= 10;
                }
                values.push(matindex);
            }
            if (this.callback) {
                this.callback.call(this, values);
            }
        }
    };

    this.dieBox.prototype.__animate = function(threadid) {
        var time = (new Date()).getTime();
        if (this.useAdaptiveTimestep) {
            var timeDiff = (time - this.lastTime) / 1000;
            if (timeDiff > 3) {
                timeDiff = 1 / 60;
            }
            while (timeDiff > 1.1 / 60) {
                this.world.step(1 / 60);
                timeDiff -= 1 / 60;
            }
            this.world.step(timeDiff);
        }
        else {
            this.world.step(1 / 60);
        }
        for (var i in this.scene.children) {
            var interact = this.scene.children[i];
            if (interact.body !== undefined) {
                interact.body.position.copy(interact.position);
                interact.body.quaternion.copy(interact.quaternion);
            }
        }
        this.renderer.render(this.scene, this.camera);
        this.lastTime = this.lastTime ? time : (new Date()).getTime();
        if (this.running === threadid) {
            this.check();
        }
        if (this.running === threadid) {
            (function(t, tid) {
                requestAnimationFrame(function() { t.__animate(tid); });
            })(this, threadid);
        }
    };

    this.dieBox.prototype.clear = function() {
        this.running = false;
        var die;
        while ((die = this.dice.pop())) {
            this.scene.remove(die); 
            if (die.body) {
                this.world.remove(die.body);
            }
        }
        if (this.pane) {
            this.scene.remove(this.pane);
        }
        this.renderer.render(this.scene, this.camera);
    };

    this.dieBox.prototype.generateVectors = function(rollSpec, coords, boost) {
        var self = this;
        function makeRandomVector(coords) {
            var randomAngle = self.rnd() * Math.PI / 5 - Math.PI / 5 / 2;
            var vec = {
                x: coords.x * Math.cos(randomAngle) - coords.y * Math.sin(randomAngle),
                y: coords.x * Math.sin(randomAngle) + coords.y * Math.cos(randomAngle)
            };
            vec.x = vec.x || 0.01;
            vec.y = vec.y || 0.01;
            return vec;
        }

        var vectors = [];
        for (var i in rollSpec.set) {
            var vec = makeRandomVector(coords);
            var pos = {
                x: this.w * (vec.x > 0 ? -1 : 1) * 0.9,
                y: this.h * (vec.y > 0 ? -1 : 1) * 0.9,
                z: self.rnd() * 200 + 200
            };
            var projector = Math.abs(vec.x / vec.y);
            if (projector > 1.0) {
                pos.y /= projector;
            } else {
                pos.x *= projector;
            }
            var velvec = makeRandomVector(coords);
            var velocity = { x: velvec.x * boost, y: velvec.y * boost, z: -10 };
            var inertia = dieInfo[rollSpec.set[i].type].inertia;
            var angle = {
                x: -(self.rnd() * vec.y * 5 + inertia * vec.y),
                y: self.rnd() * vec.x * 5 + inertia * vec.x,
                z: 0
            };
            var axis = { x: self.rnd(), y: self.rnd(), z: self.rnd(), a: self.rnd() };
            vectors.push({
                set: rollSpec.set[i].type,
                dieColor: rollSpec.set[i].dieColor,
                labelColor: rollSpec.set[i].labelColor,
                pos: pos,
                velocity: velocity,
                angle: angle,
                axis: axis
            });
        }
        return vectors;
    };

    this.dieBox.prototype.roll = function(vectors, callback) {
        this.clear();
        for (var i in vectors) {
            this.createDie(vectors[i].set,
                           vectors[i].pos,
                           vectors[i].velocity,
                           vectors[i].angle,
                           vectors[i].axis,
                           vectors[i].labelColor,
                           vectors[i].dieColor);
        }
        this.callback = callback;
        this.running = (new Date()).getTime();
        this.lastTime = 0;
        this.__animate(this.running);
    };

    this.dieBox.prototype.__selectorAnimate = function(threadid) {
        var time = (new Date()).getTime();
        var timeDiff = (time - this.lastTime) / 1000;
        if (timeDiff > 3) {
            timeDiff = 1 / 60;
        }
        var angleChange = 0.3 * timeDiff * Math.PI * Math.min(24000 + threadid - time, 6000) / 6000;
        if (angleChange < 0) {
            this.running = false;
        }
        for (var i in this.dice) {
            this.dice[i].rotation.y += angleChange;
            this.dice[i].rotation.x += angleChange / 4;
            this.dice[i].rotation.z += angleChange / 10;
        }

        this.lastTime = time;
        this.renderer.render(this.scene, this.camera);
        if (this.running === threadid) {
            (function(t, tid) {
                requestAnimationFrame(function() { t.__selectorAnimate(tid); });
            })(this, threadid);
        }
    };

    this.dieBox.prototype.searchDieByMouse = function(ev) {
        var intersects = (new THREE.Raycaster(this.camera.position, 
                                              (new THREE.Vector3((ev.clientX - this.cw) / this.aspect,
                                                                 (ev.clientY - this.ch) / this.aspect, this.w / 9))
                                              .sub(this.camera.position).normalize())).intersectObjects(this.dice);
        if (intersects.length) {
            return intersects[0].object.userData;
        }
    };

    this.dieBox.prototype.drawSelector = function() {
        this.clear();
        var step = this.w / 4.5;
        this.pane = new THREE.Mesh(new THREE.PlaneGeometry(this.cw * 20, this.ch * 20, 1, 1), 
                                   new THREE.MeshPhongMaterial({ color: 0, ambient: 0xfbfbfb, emissive: 0 }));
        this.pane.receiveShadow = true;
        this.pane.position.set(0, 0, 1);
        this.scene.add(this.pane);

        for (var i = 0, pos = -3; i < knownDieTypes.length; ++i, ++pos) {
            var die = createDie(knownDieTypes[i]);
            die.position.set(pos * step, 0, step * 0.5);
            die.castShadow = true;
            this.dice.push(die); this.scene.add(die);
        }

        this.running = (new Date()).getTime();
        this.lastTime = 0;
        this.__selectorAnimate(this.running);
    };

    this.dieBox.prototype.rollDice = function(notation, coords, boost, beforeRoll, afterRoll) {
        var vectors = this.generateVectors(notation, coords, boost);
        this.rolling = true;
        if (beforeRoll) {
            beforeRoll.call(this, vectors, notation);
        }
        if (afterRoll) {
            this.clear();
            this.roll(vectors, function(result) {
                if (afterRoll) {
                    afterRoll.call(this, notation, result);
                }
                this.rolling = false;
            });
        }
    };

    this.dieBox.prototype.rnd = function() {
        if (!randomStorage.length && useRandomStorage) {
            try {
                var randomResponse = $t.rpc({ method: "random", n: 512 });
                if (!randomResponse.error) {
                    randomStorage = randomResponse.result.random.data;
                }
                else {
                    useRandomStorage = false;
                }
            } catch (e) {
                useRandomStorage = false;
            }
        }
        return randomStorage.length ? randomStorage.pop() : Math.random();
    };

}).apply(teal.dice = teal.dice || {});
