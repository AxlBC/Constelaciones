import * as THREE from 'three';

export function makeHeartGeometry(size) {
  const j = (amt) => (Math.random() * 2 - 1) * amt;

  const P_notch = [25 + j(5), 25 + j(5)];
  const P_left  = [0 + j(4),  0 + j(4)];
  const P_midL  = [-30 + j(6), 35 + j(6)];
  const P_tip   = [25 + j(7),  95 + j(13)];
  const P_midR  = [80 + j(6),  35 + j(6)];
  const P_right = [50 + j(5),  0 + j(4)];

  const s = new THREE.Shape();
  s.moveTo(P_notch[0], P_notch[1]);

  s.bezierCurveTo(
    P_notch[0], P_notch[1],
    20 + j(7), P_left[1] + j(5),
    P_left[0], P_left[1]
  );
  s.bezierCurveTo(
    P_midL[0] + j(7), P_left[1] + j(5),
    P_midL[0] + j(5), P_midL[1],
    P_midL[0], P_midL[1]
  );
  s.bezierCurveTo(
    P_midL[0] + j(7), 55 + j(9),
    -10 + j(11), 77 + j(9),
    P_tip[0], P_tip[1]
  );
  s.bezierCurveTo(
    60 + j(9), 77 + j(9),
    P_midR[0] + j(6), 55 + j(9),
    P_midR[0], P_midR[1]
  );
  s.bezierCurveTo(
    P_midR[0], P_midR[1],
    P_right[0] + j(7), P_right[1] + j(5),
    P_right[0], P_right[1]
  );
  s.bezierCurveTo(
    35 + j(7), P_right[1] + j(5),
    P_notch[0], P_notch[1],
    P_notch[0], P_notch[1]
  );

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 10 + j(4),
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 3,
    bevelThickness: 3,
    curveSegments: 18
  });

  geo.center();
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const h = bb.max.y - bb.min.y;
  const k = size / h;
  geo.scale(k, k, k);

  geo.scale(
    0.88 + Math.random() * 0.30,
    0.90 + Math.random() * 0.26,
    0.72 + Math.random() * 0.55
  );

  return geo;
}
