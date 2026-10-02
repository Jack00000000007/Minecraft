/*
 * Blockwelt – realistische Frau (Königin im Schlafzimmer)
 * Laufzeit-Steuerung für three.js r128 (braucht THREE und THREE.GLTFLoader).
 *
 *   const frau = await Frau.load('frau.glb', { renderer, game: true });
 *   scene.add(frau.root);
 *   // jedes Bild:
 *   frau.update(dt, { camera, lookAt: spielerKopfPosition, speed: aktuelleGeschwindigkeit });
 *
 * Modell: Microsoft Rocketbox Avatar Library (MIT-Lizenz), siehe LICENSE.md.
 * Einheiten: 1 = 1 Meter, Füße bei y = 0, sie schaut nach +Z.
 */
(function (global) {
  'use strict';
  const T = global.THREE;
  if (!T) throw new Error('frau.js: THREE fehlt');

  // ------------------------------------------------------------------ shader
  const HEAD_GLSL = `
uniform vec2 fLight;
uniform vec3 fLamp;
uniform float fGame;
uniform vec3 fKeyDir;
uniform vec3 fKeyCol;
uniform float fKeyOut;
uniform float fAOMin;
uniform float fAODirect;
uniform float fEnv;
uniform float fEnvDiff;
uniform float fWrap;
float gSkin = 0.0;
float gAO = 1.0;
`;

  function physicalPars() {
    let s = T.ShaderChunk.lights_physical_pars_fragment;
    const DIFF = 'reflectedLight.directDiffuse += ( 1.0 - clearcoatDHR ) * irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );';
    const SPEC = 'reflectedLight.directSpecular += ( 1.0 - clearcoatDHR ) * irradiance * BRDF_Specular_GGX( directLight, geometry.viewDir, geometry.normal, material.specularColor, material.specularRoughness);';
    if (s.indexOf(DIFF) < 0 || s.indexOf(SPEC) < 0) {
      console.warn('frau.js: unerwarteter three.js Shader, Hautlicht aus');
      return s;
    }
    s = s.replace(DIFF, `{
		float nlRaw = dot( geometry.normal, directLight.direction );
		#ifdef FRAU_HAIR
			vec3 w = vec3( 0.25 );
		#else
			vec3 w = vec3( 0.55, 0.26, 0.16 ) * gSkin * fWrap;
		#endif
		vec3 wrapNL = clamp( ( vec3( nlRaw ) + w ) / ( 1.0 + w ), 0.0, 1.0 );
		wrapNL /= ( 1.0 + w * 0.6 );
		vec3 scatter = vec3( 0.16, 0.035, 0.01 ) * gSkin * fWrap * ( 1.0 - smoothstep( 0.0, 0.45, abs( nlRaw ) ) );
		vec3 irr = ( wrapNL + scatter ) * directLight.color;
		#ifndef PHYSICALLY_CORRECT_LIGHTS
			irr *= PI;
		#endif
		reflectedLight.directDiffuse += ( 1.0 - clearcoatDHR ) * irr * BRDF_Diffuse_Lambert( material.diffuseColor );
	}`);
    s = s.replace(SPEC, `#ifdef FRAU_HAIR
		{
			vec3 wDown = normalize( ( viewMatrix * vec4( 0.0, -1.0, 0.0, 0.0 ) ).xyz );
			vec3 tng = wDown - geometry.normal * dot( wDown, geometry.normal );
			tng = normalize( tng + vec3( 1e-4 ) );
			vec3 hv = normalize( directLight.direction + geometry.viewDir );
			float th1 = dot( normalize( tng - geometry.normal * 0.08 ), hv );
			float th2 = dot( normalize( tng + geometry.normal * 0.14 ), hv );
			float s1 = pow( sqrt( max( 1.0 - th1 * th1, 0.0 ) ), 110.0 );
			float s2 = pow( sqrt( max( 1.0 - th2 * th2, 0.0 ) ), 36.0 );
			float vis = smoothstep( -0.25, 0.35, dot( geometry.normal, directLight.direction ) );
			float upN = abs( dot( geometry.normal, -wDown ) );
			vis *= 1.0 - smoothstep( 0.55, 0.85, upN );
			vec3 hs = ( s1 * vec3( 0.10 ) + s2 * material.diffuseColor * 0.9 ) * vis * gAO;
			reflectedLight.directSpecular += hs * directLight.color * PI;
		}
	#else
		reflectedLight.directSpecular += ( 1.0 - clearcoatDHR ) * irradiance * BRDF_Specular_GGX( directLight, geometry.viewDir, geometry.normal, material.specularColor, material.specularRoughness);
	#endif`);
    return s;
  }

  const PARS = { text: null };

  function patchShader(shader, mat) {
    const U = mat.userData.frauUniforms;
    Object.assign(shader.uniforms, U);
    if (!PARS.text) PARS.text = physicalPars();
    let f = shader.fragmentShader;
    f = f.replace('#include <common>', '#include <common>\n' + HEAD_GLSL);
    f = f.replace('#include <lights_physical_pars_fragment>', PARS.text);
    f = f.replace('#include <color_fragment>', `
#if defined( USE_COLOR ) && !defined( FRAU_PROP )
	gAO = vColor.r;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif
	diffuseColor.rgb *= mix( 1.0, max( gAO, fAOMin ), fAODirect );`);
    f = f.replace('#include <alphamap_fragment>', `#include <alphamap_fragment>
#ifdef FRAU_A2C
	diffuseColor.a = clamp( ( diffuseColor.a - 0.42 ) / max( fwidth( diffuseColor.a ), 0.0001 ) + 0.5, 0.0, 1.0 );
#endif`);
    f = f.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
#if defined( USE_ROUGHNESSMAP ) && defined( FRAU_SKIN )
	gSkin = texelRoughness.r;
#endif`);
    f = f.replace('#include <lights_fragment_begin>', `#include <lights_fragment_begin>
	ReflectedLight keyRL = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	{
		IncidentLight kl;
		kl.direction = normalize( fKeyDir );
		kl.color = fKeyCol;
		kl.visible = true;
		RE_Direct( kl, geometry, material, keyRL );
	}`);
    f = f.replace('#include <lights_fragment_maps>', `#include <lights_fragment_maps>
	{
		vec3 wN = inverseTransformDirection( geometry.normal, viewMatrix );
		float hOcc = mix( 0.4, 1.0, smoothstep( -0.9, 0.3, wN.y ) );
		float aoI = max( gAO, fAOMin );
		float envK = fEnv;
		if ( fGame > 0.5 ) envK *= max( fLight.x, fLight.y * 0.8 );
		radiance *= clamp( pow( aoI, 1.6 ) * hOcc, 0.0, 1.0 ) * envK;
		iblIrradiance *= aoI * hOcc * envK * fEnvDiff;
		irradiance *= aoI;
		keyRL.directSpecular *= mix( 1.0, aoI, 0.7 );
	}`);
    const OUT = 'vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;';
    f = f.replace(OUT, `
	vec3 sceneL = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	vec3 keyL = keyRL.directDiffuse + keyRL.directSpecular;
	vec3 outgoingLight;
	if ( fGame > 0.5 ) {
		float lvS = fLight.x, lvB = fLight.y;
		float fS = lvS / ( 3.0 - 2.0 * lvS ), fB = lvB / ( 3.0 - 2.0 * lvB );
		float skyF = 0.08 + 0.92 * mix( fS, 1.0 - pow( 1.0 - fS, 4.0 ), 0.5 );
		float blkF = mix( fB, 1.0 - pow( 1.0 - fB, 4.0 ), 0.5 );
		vec3 skyPart = ( sceneL + keyL * fKeyOut ) * skyF;
		vec3 lampPart = ( keyL + diffuseColor.rgb * 0.30 * max( gAO, fAOMin ) ) * fLamp * blkF;
		outgoingLight = max( skyPart, lampPart ) + lampPart * 0.12 + totalEmissiveRadiance;
	} else {
		outgoingLight = sceneL + keyL + totalEmissiveRadiance;
	}`);
    shader.fragmentShader = f;
  }

  // ------------------------------------------------------------------ environment
  // Kleiner warmer Raum als Spiegelbild (Augenglanz, Uhr, sanfter Hautglanz).
  function makeEnv(renderer) {
    const sc = new T.Scene();
    const room = new T.Mesh(new T.BoxGeometry(10, 6, 10), new T.MeshBasicMaterial({ color: 0x4a3a30, side: T.BackSide }));
    room.position.y = 2;
    sc.add(room);
    const floor = new T.Mesh(new T.PlaneGeometry(10, 10), new T.MeshBasicMaterial({ color: 0x2a1e18 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.99; sc.add(floor);
    const panel = (w, h, c, x, y, z, ry) => {
      const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c, side: T.DoubleSide }));
      m.position.set(x, y, z); m.rotation.y = ry || 0; sc.add(m); return m;
    };
    panel(3.2, 2.2, 0xfff1dc, -2.2, 2.4, 4.9, Math.PI);      // großes weiches Fenster vorne links
    panel(1.6, 1.6, 0xffc58a, 4.9, 1.4, -1.0, -Math.PI / 2);  // warme Lampe rechts
    panel(2.5, 1.2, 0xd8e4ff, -1.0, 4.95, -1.5, 0).rotation.x = Math.PI / 2; // Himmel oben
    const pm = new T.PMREMGenerator(renderer);
    const rt = pm.fromScene(sc, 0.03);
    pm.dispose();
    return rt.texture;
  }

  // ------------------------------------------------------------------ helpers
  const _v1 = new T.Vector3(), _v2 = new T.Vector3(), _v3 = new T.Vector3();
  const _q1 = new T.Quaternion(), _q2 = new T.Quaternion(), _q3 = new T.Quaternion();
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

  function rotateBoneWorld(bone, qWorld) {
    // bone.world = parent.world * local  ->  local' = parent^-1 * q * parent * local
    bone.parent.getWorldQuaternion(_q2);
    _q3.copy(_q2).invert();
    bone.quaternion.premultiply(_q2).premultiply(qWorld).premultiply(_q3);
    bone.updateMatrixWorld(true);
  }

  function localAxis(bone, worldDir) {
    bone.getWorldQuaternion(_q1);
    return worldDir.clone().applyQuaternion(_q1.invert()).normalize();
  }

  // ------------------------------------------------------------------ Werkzeuge: Axt und Degen
  // Griff je Werkzeug (gleiche Zahlen wie beim Backen der Bewegungen in anim_bvh.py):
  // f = Handgelenk -> Mittelfingerknöchel, a = kleiner Finger -> Zeigefinger, n = Handfläche.
  // Der Stiel läuft entlang a + tan * f durch Handgelenk + cf f + cn n + ca a.
  // fingers: Beugung je Fingerglied um die lokale Z-Achse [Grund-, Mittel-, Endglied], Daumen [Z, Y, Z, Z]
  const GRIPS = {
    axe: { tan: 0.4, cf: 0.072, cn: 0.027, ca: -0.010,        // Hammergriff quer durch die Faust
      fingers: { 1: [0.7, 1.55, 0.15], 2: [1.1, 1.25, 0.6], 3: [1.25, 0.85, 0.75], 4: [0.9, 0.75, 0.65], thumb: [0.55, -0.7, 0.3, 0.5] } },
    rapier: { tan: 1.0, cf: 0.064, cn: 0.023, ca: -0.008,     // Degengriff schräg durch die Hand
      fingers: { 1: [0.4, 1.55, 0.8], 2: [1.1, 1.45, 0.6], 3: [1.4, 1.05, 0.45], 4: [1.4, 0.65, 0.45], thumb: [0.35, -0.45, 0.2, 0.3] } },
  };
  // Arbeits-Bewegungen (Schleifen) und das Werkzeug, das sie dabei in der rechten Hand hält
  const WORK = { chop: { tool: 'axe' }, strike: { tool: 'rapier' } };

  // Röhre entlang +Y, Querschnitt elliptisch: rings = [[y, rx, rz, xVersatz], ...]
  function sweepGeo(rings, seg, flat) {
    const pos = [], idx = [];
    for (const r of rings) for (let k = 0; k < seg; k++) {
      const a = k / seg * Math.PI * 2;
      pos.push((r[3] || 0) + Math.cos(a) * r[1], r[0], Math.sin(a) * r[2]);
    }
    const n = rings.length;
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < seg; k++) {
      const a = i * seg + k, b = i * seg + (k + 1) % seg;
      idx.push(a, a + seg, b, b, a + seg, b + seg);
    }
    const r0 = rings[0], r1 = rings[n - 1];
    const c0 = pos.length / 3; pos.push(r0[3] || 0, r0[0], 0);
    const c1 = c0 + 1; pos.push(r1[3] || 0, r1[0], 0);
    for (let k = 0; k < seg; k++) {
      idx.push(c0, k, (k + 1) % seg);
      idx.push(c1, (n - 1) * seg + (k + 1) % seg, (n - 1) * seg + k);
    }
    let g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    if (flat) g = g.toNonIndexed();
    g.computeVertexNormals();
    return g;
  }

  function tubeGeo(points, radius, seg) {
    const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(p[0], p[1], p[2] || 0)));
    return new T.TubeGeometry(curve, seg || 16, radius, 7, false);
  }

  function propMaterial(fig, color, metal, rough, vcol) {
    const m = new T.MeshStandardMaterial({ color, metalness: metal, roughness: rough, vertexColors: !!vcol });
    m.userData.frauUniforms = fig.uniforms;
    m.envMap = fig.env;
    m.envMapIntensity = metal > 0.5 ? 1.0 : 0.6;
    m.defines = { FRAU_PROP: '' };
    m.onBeforeCompile = shader => patchShader(shader, m);
    m.customProgramCacheKey = () => 'frau-prop' + (vcol ? '-vc' : '') + (fig.game ? '-game' : '');
    return m;
  }

  // Axt: Hickory-Stiel 79 cm mit Knauf, geschmiedeter Kopf mit blanker Schneide (Ursprung = Griff der rechten Hand)
  function buildAxe(fig) {
    const g = new T.Group(); g.name = 'Axt';
    const bend = y => -0.006 * Math.sin(Math.PI * (y + 0.175) / 0.8);
    const R = [[-0.176, 0.012, 0.009], [-0.172, 0.019, 0.0135], [-0.162, 0.0215, 0.0148], [-0.14, 0.0188, 0.0134], [-0.1, 0.0166, 0.0122],
      [0.0, 0.0165, 0.0121], [0.2, 0.0158, 0.0117], [0.42, 0.015, 0.0112], [0.53, 0.0156, 0.0116], [0.62, 0.0146, 0.011], [0.624, 0.012, 0.009]];
    const handle = new T.Mesh(sweepGeo(R.map(r => [r[0], r[1], r[2], bend(r[0])]), 14), propMaterial(fig, 0xa8733f, 0, 0.62));
    g.add(handle);
    // Kopf: Seitenriss (x: Nacken -> Schneide, y: entlang des Stiels), Dicke nimmt zur Schneide hin ab
    const P = [[-0.048, 0.029], [-0.048, -0.029], [-0.02, -0.034], [0.02, -0.034], [0.07, -0.045], [0.118, -0.068], [0.15, -0.081],
      [0.158, -0.042], [0.161, 0.0], [0.158, 0.04], [0.15, 0.066], [0.11, 0.05], [0.06, 0.036], [0.02, 0.032], [-0.02, 0.032]];
    const shape = new T.Shape(P.map(p => new T.Vector2(p[0], p[1])));
    let hg = new T.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, steps: 1 });
    hg = hg.index ? hg.toNonIndexed() : hg;
    const pa = hg.attributes.position, col = [];
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), s = clamp((x - 0.02) / 0.14, 0, 1);
      const th = x < 0.02 ? 0.041 : 0.0035 + 0.0375 * Math.pow(1 - s, 1.35);
      pa.setZ(i, (pa.getZ(i) - 0.5) * th);
      const e = clamp((x - 0.118) / 0.03, 0, 1);         // blank geschliffene Schneide
      const v = 0.34 + 0.54 * e * e * (3 - 2 * e);
      col.push(v, v * 1.02, v * 1.06);
    }
    hg.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    hg.computeVertexNormals();
    const head = new T.Mesh(hg, propMaterial(fig, 0xffffff, 0.9, 0.42, true));
    head.position.set(bend(0.575), 0.575, 0);
    g.add(head);
    return g;
  }

  // Degen: schlanke Klinge 94 cm, vergoldetes Gefäß mit Parierstange, Griffbügel und Knauf (Ursprung = Griff der rechten Hand)
  function buildRapier(fig) {
    const g = new T.Group(); g.name = 'Degen';
    const steel = propMaterial(fig, 0xd4d9df, 1, 0.24), gilt = propMaterial(fig, 0xc9a45a, 1, 0.3), leather = propMaterial(fig, 0x3a2418, 0, 0.55);
    const blade = [[0.06, 0.0098, 0.0044], [0.098, 0.0098, 0.0044], [0.104, 0.0092, 0.0041], [0.5, 0.0072, 0.0031], [0.9, 0.0042, 0.0019], [0.985, 0.0014, 0.0008], [1.0, 0.0002, 0.0002]];
    g.add(new T.Mesh(sweepGeo(blade, 4, true), steel));
    const grip = [[-0.054, 0.0105, 0.0105], [-0.048, 0.0122, 0.0122], [-0.02, 0.0131, 0.0131], [0.02, 0.0129, 0.0129], [0.043, 0.0118, 0.0118], [0.048, 0.0105, 0.0105]];
    g.add(new T.Mesh(sweepGeo(grip, 12), leather));
    const pommel = new T.LatheGeometry([[0, -0.104], [0.009, -0.102], [0.016, -0.096], [0.0205, -0.085], [0.0195, -0.072], [0.013, -0.062], [0.0085, -0.055], [0.0085, -0.05]].map(p => new T.Vector2(p[0], p[1])), 14);
    g.add(new T.Mesh(pommel, gilt));
    const block = new T.LatheGeometry([[0, 0.046], [0.012, 0.047], [0.016, 0.054], [0.012, 0.062], [0.006, 0.064]].map(p => new T.Vector2(p[0], p[1])), 12);
    g.add(new T.Mesh(block, gilt));
    g.add(new T.Mesh(tubeGeo([[-0.128, 0.073], [-0.07, 0.06], [0, 0.055], [0.05, 0.052], [0.092, 0.058]], 0.0048, 18), gilt));
    g.add(new T.Mesh(tubeGeo([[0.012, 0.056], [0.042, 0.049], [0.061, 0.018], [0.061, -0.02], [0.046, -0.052], [0.016, -0.066]], 0.0042, 18), gilt));
    for (const p of [[-0.128, 0.073], [0.092, 0.058]]) {
      const b = new T.Mesh(new T.SphereGeometry(0.0085, 10, 8), gilt); b.position.set(p[0], p[1], 0); g.add(b);
    }
    for (const z of [-1, 1]) {           // Seitenringe über der Parierstange
      const r = new T.Mesh(new T.TorusGeometry(0.019, 0.0028, 6, 18), gilt);
      r.position.set(0, 0.07, z * 0.012); r.rotation.y = z * 0.35; g.add(r);
    }
    return g;
  }

  // ------------------------------------------------------------------ figure
  class Figure {
    constructor(gltf, opts) {
      this.opts = opts;
      this.game = !!opts.game;
      this.gltf = gltf;
      this.root = new T.Group();
      this.root.name = 'Frau';
      this.model = gltf.scene;
      this.root.add(this.model);
      this.info = (gltf.scene.userData && gltf.scene.userData.clips) || {};
      this.lightValue = new T.Vector2(1, 0);   // Spiel: (Himmel, Lampe)
      this.lamp = new T.Color(1.08, 0.8, 0.5);
      this.uniforms = {
        fLight: { value: this.lightValue },
        fLamp: { value: new T.Vector3(1.08, 0.8, 0.5) },
        fGame: { value: this.game ? 1 : 0 },
        fKeyDir: { value: new T.Vector3(-0.45, 0.5, 0.75).normalize() },
        fKeyCol: { value: new T.Color(this.game ? 0.95 : 0.34, this.game ? 0.92 : 0.31, this.game ? 0.88 : 0.29) },
        fKeyOut: { value: this.game ? 0.3 : 1 },
        fAOMin: { value: 0.3 },
        fAODirect: { value: 0.35 },
        fEnv: { value: 1 },
        fEnvDiff: { value: this.game ? 0 : 1 },   // Spiel: Umgebungslicht kommt schon vom HemisphereLight
        fWrap: { value: 1 },
      };
      this.meshes = [];
      this.morphMeshes = [];
      this.bones = {};
      this.model.traverse(o => {
        if (o.isBone) this.bones[o.name] = o;
        if (o.isMesh) {
          this.meshes.push(o);
          o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
          if (o.morphTargetDictionary) this.morphMeshes.push(o);
        }
      });
      this.bindQ = new Map();
      for (const n in this.bones) this.bindQ.set(this.bones[n], this.bones[n].quaternion.clone());
      this._setupMaterials(opts);
      this._setupTools();
      this._setupAnimation();
      this._setupFace();
      this.mode = 'idle';
      this.work = null;          // 'chop' | 'strike' während einer Arbeit (bleibt beim Gehen bestehen)
      this.bed = null;           // 'lying' | 'sleep' | 'getting_up' im Bett
      this.onHit = null;         // Rückruf (name) im Moment des Treffers von chop und strike
      this.eyesClosed = 0;
      this.lookW = 0; this.smile = 0; this.talkT = 0; this.visT = 0; this.vis = {};
      this.blinkT = 1 + Math.random() * 2; this.blinkPhase = -1;
      this.saccT = 0.5; this.sacc = new T.Vector2();
      this.idleT = 10 + Math.random() * 10;
      this.lookDir = null;
    }

    // ---- materials
    _setupMaterials(opts) {
      const renderer = opts.renderer;
      let a2c = false;
      if (renderer) {
        const gl = renderer.getContext();
        const attr = gl.getContextAttributes ? gl.getContextAttributes() : null;
        a2c = !!(attr && attr.antialias) && (renderer.capabilities.isWebGL2 || !!gl.getExtension('OES_standard_derivatives'));
      }
      if (opts.alphaToCoverage === false) a2c = false;
      this.env = opts.envMap !== undefined ? opts.envMap : (renderer ? makeEnv(renderer) : null);
      const maxTex = opts.maxTexture || 0;
      const done = new Set();
      for (const mesh of this.meshes) {
        const src = mesh.material;
        const kind = /hair/.test(src.name) ? 'hair' : (/head/.test(src.name) ? 'head' : 'body');
        const m = src.clone();
        m.name = src.name;
        m.userData.frauUniforms = this.uniforms;
        m.envMap = this.env;
        m.envMapIntensity = kind === 'hair' ? 0.2 : 1.0;
        m.defines = Object.assign({}, m.defines);
        if (kind !== 'hair') m.defines.FRAU_SKIN = '';
        if (kind === 'hair') {
          m.defines.FRAU_HAIR = '';
          m.roughness = 0.62; m.metalness = 0;
          m.transparent = false; m.depthWrite = true; m.side = T.DoubleSide;
          if (a2c) { m.defines.FRAU_A2C = ''; m.alphaToCoverage = true; m.alphaTest = 0; m.extensions = { derivatives: true }; }
          else { m.alphaTest = 0.5; }
        }
        if (this.game) {
          for (const t of [m.map]) if (t) t.encoding = T.LinearEncoding;
        }
        if (maxTex) for (const key of ['map', 'normalMap', 'roughnessMap']) {
          const t = m[key];
          if (t && !done.has(t) && t.image && t.image.width > maxTex) { shrinkTexture(t, maxTex); done.add(t); }
        }
        m.onBeforeCompile = shader => patchShader(shader, m);
        m.customProgramCacheKey = () => 'frau-' + kind + (a2c ? '-a2c' : '') + (this.game ? '-game' : '');
        m.needsUpdate = true;
        mesh.material = m;
        mesh.userData.kind = kind;
      }
    }

    // ---- tools (Axt, Degen) and the fist of the right hand
    _setupTools() {
      this.tools = {};
      this.fists = {};
      this.tool = null; this.toolWanted = 'auto';
      this.gripW = 0;
      const hand = this.bones.Bip01_R_Hand;
      const need = ['Bip01_R_Finger1', 'Bip01_R_Finger2', 'Bip01_R_Finger4'];
      if (!hand || need.some(n => !this.bones[n])) return;
      this.model.updateMatrixWorld(true);
      const P = n => this.bones[n].getWorldPosition(new T.Vector3());
      const w = P('Bip01_R_Hand');
      const f = P('Bip01_R_Finger2').sub(w).normalize();
      const a = P('Bip01_R_Finger1').sub(P('Bip01_R_Finger4')); a.addScaledVector(f, -a.dot(f)).normalize();
      const n = new T.Vector3().crossVectors(a, f);
      const handInv = new T.Matrix4().copy(hand.matrixWorld).invert();
      const Zax = new T.Vector3(0, 0, 1), Yax = new T.Vector3(0, 1, 0);
      const rq = (ax, ang) => new T.Quaternion().setFromAxisAngle(ax, ang);
      const build = { axe: buildAxe, rapier: buildRapier };
      for (const name in GRIPS) {
        const gp = GRIPS[name];
        // Rahmen des Werkzeugs: Y entlang des Stiels (zum Kopf / zur Spitze), X zur Seite der Fingerknöchel
        const G = a.clone().addScaledVector(f, gp.tan).normalize();
        const X = f.clone().addScaledVector(G, -f.dot(G)).normalize();
        const Z = new T.Vector3().crossVectors(X, G);
        const C = w.clone().addScaledVector(f, gp.cf).addScaledVector(n, gp.cn).addScaledVector(a, gp.ca);
        const obj = build[name](this);
        obj.matrixAutoUpdate = false;
        obj.matrix.copy(handInv).multiply(new T.Matrix4().makeBasis(X, G, Z).setPosition(C));
        obj.visible = false;
        obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        hand.add(obj);
        this.tools[name] = obj;
        // Finger der rechten Hand um diesen Griff
        const F = gp.fingers, list = [];
        for (const k of ['1', '2', '3', '4']) ['', '1', '2'].forEach((suf, j) => {
          const b = this.bones['Bip01_R_Finger' + k + suf];
          if (b) list.push([b, this.bindQ.get(b).clone().multiply(rq(Zax, F[k][j]))]);
        });
        const t = F.thumb, th = k => this.bones['Bip01_R_Finger' + k];
        if (th('0')) list.push([th('0'), this.bindQ.get(th('0')).clone().multiply(rq(Zax, t[0])).multiply(rq(Yax, t[1]))]);
        if (th('01')) list.push([th('01'), this.bindQ.get(th('01')).clone().multiply(rq(Zax, t[2]))]);
        if (th('02')) list.push([th('02'), this.bindQ.get(th('02')).clone().multiply(rq(Zax, t[3]))]);
        this.fists[name] = list;
      }
    }

    /** Werkzeug in der rechten Hand: 'axe' | 'rapier' | null (keins) | 'auto' (passend zur Arbeit, Standard) */
    setTool(name) { this.toolWanted = name === undefined ? 'auto' : name; this._updateTool(); }

    _updateTool() {
      const want = this.toolWanted === 'auto' ? (this.work && !this.bed ? WORK[this.work].tool : null) : this.toolWanted;
      if (want === this.tool) return;
      for (const k in this.tools) this.tools[k].visible = k === want;
      this.tool = this.tools[want] ? want : null;
    }

    // ---- animation
    _setupAnimation() {
      this.mixer = new T.AnimationMixer(this.model);
      this.clips = {};
      for (const c of this.gltf.animations) this.clips[c.name] = c;
      this.actions = {};
      for (const name in this.clips) {
        const a = this.mixer.clipAction(this.clips[name]);
        const mode = (this.info[name] || {}).mode;
        if (mode === 'oneshot') { a.setLoop(T.LoopOnce, 1); a.clampWhenFinished = true; }
        this.actions[name] = a;
      }
      this.current = null;
      this.oneshot = null;
      this.mixer.addEventListener('finished', e => this._onFinished(e));
      this._fadeTo('idle', 0);
    }

    speedOf(name) { return (this.info[name] || {}).speed_m_s || { walk: 1.15, walk_fast: 1.53, run: 2.77 }[name] || 1; }

    _fadeTo(name, dur) {
      const next = this.actions[name];
      if (!next || next === this.current) return;
      next.reset();
      next.setEffectiveTimeScale(1).setEffectiveWeight(1);
      next.play();
      if (this.current && dur > 0) this.current.crossFadeTo(next, dur, false);
      else if (this.current) this.current.stop();
      // Schleifen beginnen an zufälliger Stelle, Arbeit (Hacken, Kämpfen) von vorne mit dem Ausholen
      if (this.info[name] && this.info[name].mode !== 'oneshot' && !WORK[name]) next.time = Math.random() * next.getClip().duration;
      this.current = next;
      this.currentName = name;
    }

    _onFinished(e) {
      const name = e.action.getClip().name;
      if (name === 'sit_down') { this._fadeTo('sit', 0.35); this.mode = 'sit'; return; }
      if (name === 'stand_up') { this._fadeTo('idle', 0.4); this.mode = 'idle'; return; }
      if (name === 'lie_down' && this.bed === 'lying') {
        this.bed = 'sleep'; this.mode = 'sleep'; this._fadeTo('sleep', 0.5);
        if (this._getUpAfter) { this._getUpAfter = false; this.getUp(); }
        return;
      }
      if (name === 'get_up' && this.bed === 'getting_up') { this.bed = null; this.mode = 'idle'; this._fadeTo('idle', 0.45); return; }
      if (this.oneshot && e.action === this.actions[this.oneshot]) {
        this.oneshot = null;
        this._fadeTo(this.mode === 'sit' ? 'sit' : this._baseClip(), 0.45);
      }
    }

    _baseClip() {
      if (WORK[this.mode] || this.mode === 'walk' || this.mode === 'walk_fast' || this.mode === 'run') return this.mode;
      if (this.mode === 'talk') return 'talk';
      return Math.random() < 0.7 ? 'idle' : 'idle_breathe';
    }

    _busy() {
      return !!this.bed || this.mode === 'sit' || this.mode === 'sitting' || this.mode === 'standing' ||
        this.currentName === 'sit_down' || this.currentName === 'stand_up';
    }

    // Bewegungsart wechseln, ohne eine Arbeit zu beenden (Gehen zwischen zwei Hieben)
    _setLoco(mode) {
      if (mode === this.mode) return;
      this.mode = mode;
      if (WORK[mode]) { this.oneshot = null; this._fadeTo(mode, 0.25); return; }
      if (!this.oneshot || mode !== 'idle') { this.oneshot = null; this._fadeTo(this._baseClip(), mode === 'idle' ? 0.35 : 0.25); }
    }

    /**
     * Bewegungsart: 'idle' | 'walk' | 'walk_fast' | 'run' | 'talk'
     * Arbeit (Schleife, mit Werkzeug): 'chop' (Holz hacken, Axt) | 'strike' (Degenstoß)
     * Bett: 'sleep' oder 'lie_down' (hinlegen und schlafen), 'get_up' (aufstehen)
     */
    setMode(mode) {
      if (mode === 'sleep' || mode === 'lie_down') { this.lieDown(); return; }
      if (mode === 'get_up') { this.getUp(); return; }
      if (this._busy()) return;
      if (WORK[mode]) { if (!this.actions[mode]) return; this.work = mode; }
      else this.work = null;
      this._updateTool();
      this._setLoco(mode);
    }

    /** Gesten: 'wave' | 'touch_hair' | 'look_around'; außerdem 'chop', 'strike', 'sleep', 'lie_down', 'get_up' wie bei setMode */
    play(name) {
      if (WORK[name] || name === 'sleep' || name === 'lie_down' || name === 'get_up') {
        this.setMode(name);
        return name === 'get_up' ? !this.bed || this.bed === 'getting_up' : WORK[name] ? this.work === name : !!this.bed;
      }
      if (!this.actions[name] || this.bed || this.work || this.mode === 'walk' || this.mode === 'walk_fast' || this.mode === 'run') return false;
      if (this.mode === 'sit' && name !== 'wave') return false;
      this.oneshot = name;
      this._fadeTo(name, 0.3);
      return true;
    }

    /**
     * Ins Bett legen: sie steht mit dem Rücken zur Bettkante (siehe LIESMICH.md), setzt sich hoch, legt sich hin und schläft.
     * Die Wurzel (frau.root) bleibt dabei stehen, die Bewegung bringt sie selbst aufs Bett.
     */
    lieDown() {
      if (this.bed || !this.actions.lie_down) return false;
      if (this.mode === 'sit' || this.mode === 'sitting' || this.mode === 'standing' || this.currentName === 'sit_down' || this.currentName === 'stand_up') return false;
      this.work = null; this.oneshot = null; this._getUpAfter = false;
      this.bed = 'lying'; this.mode = 'lying';
      this._updateTool();
      this._fadeTo('lie_down', 0.35);
      return true;
    }

    /** Aus dem Bett aufstehen; danach steht sie wieder am Platz vor dem Bett */
    getUp() {
      if (this.bed === 'lying') { this._getUpAfter = true; return true; }
      if (this.bed !== 'sleep' || !this.actions.get_up) return false;
      this.bed = 'getting_up'; this.mode = 'getting_up';
      this._fadeTo('get_up', 0.45);
      return true;
    }

    /** 'idle', 'walk', ..., 'chop', 'strike', 'sit', 'lying', 'sleep', 'getting_up' ... */
    get state() { return this.mode; }

    sit() { if (this.mode === 'sit' || this.currentName === 'sit_down' || this.bed) return; this.oneshot = null; this.work = null; this._updateTool(); this.mode = 'sitting'; this._fadeTo('sit_down', 0.3); }
    standUp() { if (this.mode !== 'sit') return; this.mode = 'standing'; this._fadeTo('stand_up', 0.3); }
    /** Mund bewegt sich für t Sekunden (Sprechblase im Spiel) */
    say(seconds) { this.talkT = Math.max(this.talkT, seconds || 2); }
    /** Spiellicht (Himmel 0..1, Lampe 0..1), z. B. aus lightAt() */
    setLight(sky, lamp) { this.lightValue.set(sky, lamp); }

    // ---- face and look-at
    _setupFace() {
      const B = this.bones;
      this.head = B.Bip01_Head; this.neck = B.Bip01_Neck; this.chest = B.Bip01_Spine2;
      this.eyeL = B.Bip01_LEye; this.eyeR = B.Bip01_REye;
      this.model.updateMatrixWorld(true);
      const fwd = new T.Vector3(0, 0, 1), up = new T.Vector3(0, 1, 0);
      this.model.getWorldQuaternion(_q1);
      const wf = fwd.clone().applyQuaternion(_q1), wu = up.clone().applyQuaternion(_q1);
      if (this.head) { this.headFwd = localAxis(this.head, wf); }
      if (this.chest) { this.chestFwd = localAxis(this.chest, wf); this.chestUp = localAxis(this.chest, wu); }
      if (this.eyeL) { this.eyeLFwd = localAxis(this.eyeL, wf); this.eyeRFwd = localAxis(this.eyeR, wf); }
      this.morph = {};
      for (const m of this.morphMeshes) {
        for (const k in m.morphTargetDictionary) (this.morph[k] = this.morph[k] || []).push([m, m.morphTargetDictionary[k]]);
      }
    }

    _setMorph(name, w) {
      const l = this.morph[name];
      if (l) for (const [m, i] of l) m.morphTargetInfluences[i] = w;
    }

    _look(dt, target) {
      if (!this.head || !this.chest) return;
      let want = 0;
      const moving = this.mode === 'walk' || this.mode === 'walk_fast' || this.mode === 'run';
      if (target) want = moving ? 0.5 : 1;
      if (this.oneshot === 'look_around' || this.oneshot === 'touch_hair') want *= 0.35;
      if (this.work) want *= 0.3;   // bei der Arbeit schaut sie auf Holz oder Gegner, nur kurz zum Spieler
      if (this.bed) { want = 0; target = null; }
      // Augen jedes Bild von der Ruhelage aus drehen (keine Animation bewegt sie)
      if (this.eyeL) { this.eyeL.quaternion.copy(this.bindQ.get(this.eyeL)); this.eyeR.quaternion.copy(this.bindQ.get(this.eyeR)); }
      const headPos = this.head.getWorldPosition(_v1);
      this.chest.getWorldQuaternion(_q1);
      const cf = _v2.copy(this.chestFwd).applyQuaternion(_q1);
      const cu = _v3.copy(this.chestUp).applyQuaternion(_q1);
      const cr = new T.Vector3().crossVectors(cu, cf).normalize();
      let yaw = 0, pitch = 0;
      if (target) {
        const d = target.clone().sub(headPos);
        const dist = d.length();
        d.normalize();
        yaw = Math.atan2(d.dot(cr), d.dot(cf));
        pitch = Math.asin(clamp(d.dot(cu), -1, 1));
        if (Math.abs(yaw) > 1.95) want = 0;                       // hinter ihr: nicht verrenken
        else if (Math.abs(yaw) > 1.4) want *= (1.95 - Math.abs(yaw)) / 0.55;
        if (dist > 12) want *= clamp((20 - dist) / 8, 0, 1);
        yaw = clamp(yaw, -1.2, 1.2);
        pitch = clamp(pitch, -0.45, 0.4);
      }
      this.lookW = damp(this.lookW, want, 3, dt);
      this.lookYaw = damp(this.lookYaw || 0, yaw, 5, dt);
      this.lookPitch = damp(this.lookPitch || 0, pitch, 5, dt);
      if (this.lookW < 0.01) return;
      // Zielrichtung relativ zur Brust
      const dir = cf.clone().applyAxisAngle(cu, this.lookYaw);
      const side = new T.Vector3().crossVectors(cu, dir).normalize();
      dir.applyAxisAngle(side, -this.lookPitch).normalize();
      for (const [bone, share] of [[this.neck, 0.4], [this.head, 1.0]]) {
        if (!bone) continue;
        this.head.getWorldQuaternion(_q1);
        const cur = this.headFwd.clone().applyQuaternion(_q1);
        const q = new T.Quaternion().setFromUnitVectors(cur, dir);
        const q0 = new T.Quaternion();
        q0.slerp(q, share * this.lookW);
        rotateBoneWorld(bone, q0);
      }
      // Augen
      if (this.eyeL && target) {
        for (const [eye, fw] of [[this.eyeL, this.eyeLFwd], [this.eyeR, this.eyeRFwd]]) {
          eye.getWorldQuaternion(_q1);
          const cur = fw.clone().applyQuaternion(_q1);
          const ep = eye.getWorldPosition(new T.Vector3());
          const d = target.clone().sub(ep).normalize();
          // Blicksprünge (Sakkaden)
          d.addScaledVector(side, this.sacc.x).addScaledVector(cu, this.sacc.y).normalize();
          const q = new T.Quaternion().setFromUnitVectors(cur, d);
          const ang = 2 * Math.acos(clamp(Math.abs(q.w), 0, 1));
          const lim = 0.45;
          const k = ang > lim ? lim / ang : 1;
          const q0 = new T.Quaternion().slerp(q, k * this.lookW);
          rotateBoneWorld(eye, q0);
        }
      }
    }

    _face(dt, ctx) {
      // Blinzeln
      this.blinkT -= dt;
      if (this.blinkT <= 0 && this.blinkPhase < 0) { this.blinkPhase = 0; }
      let blink = 0;
      if (this.blinkPhase >= 0) {
        this.blinkPhase += dt;
        const p = this.blinkPhase;
        blink = p < 0.07 ? p / 0.07 : (p < 0.11 ? 1 : Math.max(0, 1 - (p - 0.11) / 0.13));
        if (p > 0.24) { this.blinkPhase = -1; this.blinkT = Math.random() < 0.15 ? 0.25 : 1.8 + Math.random() * 4.2; }
      }
      // im Bett: Augen zu, sobald sie liegt; beim Aufstehen wieder auf
      let closed = 0;
      if (this.bed === 'sleep') closed = 1;
      else if (this.bed === 'lying' && this.current) closed = clamp((this.current.time / this.current.getClip().duration - 0.75) * 5, 0, 1);
      this.eyesClosed = damp(this.eyesClosed, closed, closed > this.eyesClosed ? 1.2 : 6, dt);
      blink = Math.max(blink, this.eyesClosed);
      this._setMorph('AK_09_EyeBlinkLeft', blink);
      this._setMorph('AK_10_EyeBlinkRight', blink);
      // Blicksprünge
      this.saccT -= dt;
      if (this.saccT <= 0) {
        this.saccT = 0.4 + Math.random() * 1.8;
        const r = Math.random() < 0.6 ? 0.012 : 0.035;
        this.sacc.set((Math.random() * 2 - 1) * r, (Math.random() * 2 - 1) * r * 0.6);
      }
      // Lächeln, wenn Markus nah ist und sie ihn ansieht
      let smileT = 0.1;
      if (ctx.lookAt && this.head) {
        const d = ctx.lookAt.distanceTo(this.head.getWorldPosition(_v1));
        smileT = 0.1 + 0.45 * clamp((3.2 - d) / 1.8, 0, 1) * this.lookW;
      }
      if (ctx.smile !== undefined) smileT = ctx.smile;
      if (this.bed) smileT = this.bed === 'sleep' ? 0.08 : Math.min(smileT, 0.15);
      this.smile = damp(this.smile, smileT, 1.5, dt);
      this._setMorph('AK_44_MouthSmileLeft', this.smile);
      this._setMorph('AK_45_MouthSmileRight', this.smile * 0.96);
      this._setMorph('AK_19_EyeSquintLeft', this.smile * 0.35);
      this._setMorph('AK_20_EyeSquintRight', this.smile * 0.35);
      // Sprechen: weiche, zufällige Mundformen
      const V = ['AA_VI_10_aa', 'AA_VI_11_E', 'AA_VI_13_O', 'AA_VI_01_PP', 'AA_VI_07_SS'];
      if (this.talkT > 0) {
        this.talkT -= dt; this.visT -= dt;
        if (this.visT <= 0) {
          this.visT = 0.07 + Math.random() * 0.12;
          this.visTarget = {};
          const v = V[(Math.random() * V.length) | 0];
          this.visTarget[v] = 0.35 + Math.random() * 0.45;
          if (Math.random() < 0.2) this.visTarget = {};
        }
      } else this.visTarget = {};
      for (const v of V) {
        this.vis[v] = damp(this.vis[v] || 0, (this.visTarget && this.visTarget[v]) || 0, 18, dt);
        this._setMorph(v, this.vis[v]);
      }
      this._setMorph('AK_03_BrowInnerUp', 0.12 * this.smile);
    }

    /**
     * ctx: { camera, lookAt: Vector3 (Weltposition, z. B. Kopf des Spielers), speed: m/s (optional),
     *        smile: 0..1 (optional), autoGestures: true }
     */
    update(dt, ctx) {
      ctx = ctx || {};
      dt = Math.min(dt, 0.1);
      if (ctx.speed !== undefined && !this._busy()) {
        const s = ctx.speed;
        // bei der Arbeit (Hacken, Kämpfen) erst ab 0,5 m/s gehen, sonst weiter hacken oder zustechen
        const moving = s >= (this.work ? 0.5 : 0.12);
        const m = !moving ? (this.work || (this.talkT > 0.5 ? 'talk' : 'idle')) : s < 1.35 ? 'walk' : s < 2.1 ? 'walk_fast' : 'run';
        if (this.work) this._setLoco(m); else this.setMode(m);
        if (moving) {
          const a = this.actions[m];
          if (a) a.timeScale = clamp(s / this.speedOf(m), 0.6, 1.6);
        }
      }
      if (ctx.autoGestures !== false && this.mode === 'idle' && !this.oneshot) {
        this.idleT -= dt;
        if (this.idleT <= 0) {
          this.idleT = 14 + Math.random() * 18;
          this.play(Math.random() < 0.55 ? 'touch_hair' : 'look_around');
        }
      }
      this.mixer.update(dt);
      this._afterMixer(dt);
      this.model.updateMatrixWorld(true);
      this._look(dt, ctx.lookAt || null);
      this._face(dt, ctx);
      if (ctx.camera) {
        // Schlüssellicht kommt immer von vorne-links-oben aus Sicht der Kamera
        this.uniforms.fKeyDir.value.set(-0.45, 0.5, 0.75).normalize();
      }
    }

    // Faust um das Werkzeug, Treffer-Zeitpunkte der Arbeits-Schleifen
    _afterMixer(dt) {
      this._updateTool();
      if (this.tool) this._gripOf = this.tool;
      this.gripW = damp(this.gripW, this.tool ? 1 : 0, 14, dt);
      const fist = this.fists && this.fists[this._gripOf];
      if (this.gripW > 0.002 && fist) for (const [b, q] of fist) b.quaternion.slerp(q, this.gripW);
      const a = this.work && this.current === this.actions[this.work] ? this.current : null;
      if (a) {
        const t = a.time, prev = this._workT, hits = (this.info[this.work] || {}).hits || [];
        if (prev !== undefined && this.onHit) for (const h of hits) {
          if ((prev < h && t >= h) || (t < prev && (h > prev || h <= t))) this.onHit(this.work);
        }
        this._workT = t;
      } else this._workT = undefined;
    }

    dispose() {
      this.mixer.stopAllAction();
      for (const k in this.tools) this.tools[k].traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
      for (const m of this.meshes) { m.geometry.dispose(); m.material.dispose(); }
      const seen = new Set();
      for (const m of this.meshes) for (const k of ['map', 'normalMap', 'roughnessMap']) {
        const t = m.material[k]; if (t && !seen.has(t)) { seen.add(t); t.dispose(); }
      }
      if (this.env && !this.opts.envMap) this.env.dispose();
      if (this.root.parent) this.root.parent.remove(this.root);
    }
  }

  function shrinkTexture(tex, size) {
    const img = tex.image;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    c.getContext('2d').drawImage(img, 0, 0, size, size);
    tex.image = c;
    tex.needsUpdate = true;
  }

  // ------------------------------------------------------------------ loader
  const Frau = {
    /**
     * url: Adresse von frau.glb oder ein ArrayBuffer (z. B. aus Base64).
     * opts: { renderer (Pflicht für Umgebungslicht und Kantenglättung der Haare), game: true im Blockwelt-Spiel,
     *         maxTexture: 1024 für schwache Geräte, envMap, onProgress(0..1) }
     */
    load(url, opts) {
      opts = opts || {};
      return new Promise((resolve, reject) => {
        const loader = new T.GLTFLoader();
        const ok = gltf => { try { resolve(new Figure(gltf, opts)); } catch (e) { reject(e); } };
        if (url instanceof ArrayBuffer) loader.parse(url, '', ok, reject);
        else loader.load(url, ok, e => { if (opts.onProgress && e.total) opts.onProgress(e.loaded / e.total); }, reject);
      });
    },
    Figure,
  };
  global.Frau = Frau;
})(typeof window !== 'undefined' ? window : this);
