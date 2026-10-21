import * as THREE from 'three';
import type { SandboxRoomId } from '@/domain/sandbox-rooms';
import type { PortalProjects } from '@/domain/studio-portal';
import { videoClubTapeSlot } from '@/domain/video-club';
import { drawSandboxProjectCover } from './sandbox-project-cover';
import {
  portalWorldPosition,
  worldTravel,
  worldDestination,
  worldDestinationCamera,
  WORLD_TRAVEL_MS,
  type WorldAnchor,
} from '@/domain/sandbox-world-motion';

interface RoomDefinition {
  id: SandboxRoomId;
  image: string;
}
interface RoomScene {
  scene: THREE.Scene;
  group: THREE.Group;
  objects: THREE.Group;
}
export interface WorldRenderer {
  preview: (room: SandboxRoomId, anchor: WorldAnchor) => Promise<void>;
  enter: (room: SandboxRoomId, anchor: WorldAnchor) => Promise<void>;
  leave: () => void;
  look: (x: number, y: number) => void;
  aim: (anchor: WorldAnchor) => void;
  cancel: () => void;
  dispose: () => void;
}

const portalFragment = `
uniform sampler2D room;
uniform vec2 resolution;
uniform float time;
uniform float opening;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p) {
  return noise(p)*.55+noise(p*2.07)*.27+noise(p*4.13)*.12+noise(p*8.1)*.06;
}
void main() {
  vec2 p=(vUv-.5)*2.;
  float angle=atan(p.y,p.x);
  float radius=length(p);
  float wave=sin(angle*5.+time*.65)*.035+sin(angle*9.-time*.8)*.018;
  float flow=fbm(p*7.+vec2(time*.25,-time*.42))-.5;
  float edge=(.76+wave+flow*.13)*opening;
  float d=radius-edge;
  float inside=1.-smoothstep(-.012,.012,d);
  float core=exp(-abs(d)*155.);
  float fire=exp(-abs(d)*34.)*(.55+fbm(p*28.-time*.7));
  float aura=exp(-abs(d)*12.)*.25;
  vec2 cell=p*180.+vec2(time*12.,-time*18.);
  float sparks=pow(noise(cell),22.)*exp(-abs(d-.035)*14.)*5.;
  vec3 electric=mix(vec3(.22,.62,1.),vec3(1.,.51,.24),noise(p*4.+time*.12));
  vec3 emission=electric*(fire*1.5+aura)+vec3(1.,.96,.86)*(core*2.5+sparks);
  vec3 view=texture2D(room,gl_FragCoord.xy/resolution).rgb;
  float alpha=max(inside,clamp(core+fire+aura+sparks,0.,1.));
  if(alpha<.005 || opening<.005) discard;
  gl_FragColor=vec4(view*inside+emission,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error(`Décor indisponible : ${url}`));
    };
    image.src = url;
  });
}

export async function createWorldRenderer(
  canvas: HTMLCanvasElement,
  definitions: readonly RoomDefinition[],
  initial: SandboxRoomId,
  projects: PortalProjects,
  onArrival: (id: SandboxRoomId) => void,
  onTravel: (active: boolean) => void,
): Promise<WorldRenderer> {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const camera = new THREE.PerspectiveCamera(52, 1672 / 941, 0.03, 100);
  camera.position.z = 4;
  const referenceCamera = camera.clone();
  const destinationCamera = camera.clone();
  referenceCamera.updateMatrixWorld();
  const projection = new THREE.Matrix4().multiplyMatrices(
    referenceCamera.projectionMatrix,
    referenceCamera.matrixWorldInverse,
  );
  const target = new THREE.WebGLRenderTarget(1, 1);
  const rooms = new Map<SandboxRoomId, Promise<RoomScene>>();
  const resources: { dispose: () => void }[] = [target];
  let disposed = false;
  let frame = 0;
  let version = 0;
  let currentId = initial;
  let current: RoomScene | undefined;
  let destination: RoomScene | null = null;
  let destinationId: SandboxRoomId | null = null;
  let anchor: WorldAnchor = { x: 0.637, y: 0.35 };
  let wantedAnchor = anchor;
  let openness = 0;
  let wantedOpen = 0;
  let started = 0;
  let traveling = false;
  let entering = false;
  const travelStart = { x: 0, y: 0, z: 4 };
  const uniforms = {
    room: { value: target.texture },
    resolution: { value: new THREE.Vector2() },
    time: { value: 0 },
    opening: { value: 0 },
  };
  const portalMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: portalFragment,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
  });
  const portalGeometry = new THREE.PlaneGeometry(3.6, 4.9);
  const portal = new THREE.Mesh(portalGeometry, portalMaterial);
  resources.push(portalGeometry, portalMaterial);
  portal.renderOrder = 5;

  function track<T extends { dispose: () => void }>(resource: T): T {
    if (disposed) resource.dispose();
    else resources.push(resource);
    return resource;
  }

  async function roomScene(id: SandboxRoomId): Promise<RoomScene> {
    const cached = rooms.get(id);
    if (cached) return cached;
    const definition = definitions.find((item) => item.id === id);
    if (!definition) throw new Error('Pièce inconnue');
    const promise = (async () => {
      const photo = await loadImage(definition.image);
      if (disposed) throw new Error('Visite fermée');
      const texture = track(new THREE.Texture(photo));
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      const group = new THREE.Group();
      const objects = new THREE.Group();
      group.add(objects);
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#161619');
      scene.add(group);
      const material = track(
        new THREE.ShaderMaterial({
          uniforms: {
            photo: { value: texture },
            reference: { value: projection },
            outsideColor: { value: new THREE.Color(id === 'projects' ? '#071823' : '#111824') },
          },
          vertexShader: `
          uniform mat4 reference; varying vec4 projected;
          void main(){
            projected=reference*vec4(position,1.);
            gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
          }`,
          fragmentShader: `
          uniform sampler2D photo; uniform vec3 outsideColor; varying vec4 projected;
          void main(){
            vec2 uv=projected.xy/projected.w*.5+.5;
            float border=min(min(uv.x,uv.y),min(1.-uv.x,1.-uv.y));
            float known=projected.w>0.?smoothstep(0.,.015,border):0.;
            vec3 color=texture2D(photo,clamp(uv,vec2(.001),vec2(.999))).rgb;
            gl_FragColor=vec4(mix(outsideColor,color,known),1.);
            #include <colorspace_fragment>
          }`,
          side: THREE.DoubleSide,
        }),
      );
      // Projection de la photographie sur cinq surfaces : la caméra peut franchir l'entrée.
      function quad(vertices: number[]) {
        const geometry = track(new THREE.BufferGeometry());
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex([0, 1, 2, 0, 2, 3]);
        group.add(new THREE.Mesh(geometry, material));
      }
      const left = -6.75,
        right = 6.58,
        floor = -2.34,
        ceiling = 4.29,
        back = -6,
        front = 6;
      // L'entrée évasée contient aussi les trajets déclenchés près des coins de l'image.
      const entranceLeft = -12,
        entranceRight = 12,
        entranceFloor = -8,
        entranceCeiling = 8;
      quad([left, floor, back, right, floor, back, right, ceiling, back, left, ceiling, back]);
      quad([
        entranceLeft,
        entranceFloor,
        front,
        entranceRight,
        entranceFloor,
        front,
        right,
        floor,
        back,
        left,
        floor,
        back,
      ]);
      quad([
        left,
        ceiling,
        back,
        right,
        ceiling,
        back,
        entranceRight,
        entranceCeiling,
        front,
        entranceLeft,
        entranceCeiling,
        front,
      ]);
      quad([
        left,
        floor,
        back,
        left,
        ceiling,
        back,
        entranceLeft,
        entranceCeiling,
        front,
        entranceLeft,
        entranceFloor,
        front,
      ]);
      quad([
        entranceRight,
        entranceFloor,
        front,
        entranceRight,
        entranceCeiling,
        front,
        right,
        ceiling,
        back,
        right,
        floor,
        back,
      ]);
      if (id === 'projects') {
        await document.fonts.ready;
        const fontFamily = getComputedStyle(canvas).fontFamily;
        await Promise.all(
          projects.flatMap((bay, bayIndex) =>
            bay.map(async (project, index) => {
              const art = document.createElement('canvas');
              art.width = 264;
              art.height = 392;
              const ctx = art.getContext('2d');
              if (!ctx) return;
              let cover: HTMLImageElement | undefined;
              if (project.image) {
                try {
                  cover = await loadImage(
                    `/_next/image?url=${encodeURIComponent(project.image)}&w=256&q=75`,
                  );
                } catch {
                  // La cassette garde sa couleur et son titre si la couverture manque.
                }
              }
              drawSandboxProjectCover(ctx, project, cover, fontFamily);
              const coverTexture = track(new THREE.CanvasTexture(art));
              coverTexture.colorSpace = THREE.SRGBColorSpace;
              const size = portalWorldPosition({ x: 0.5 + 66 / 1672, y: 0.5 - 98 / 941 });
              const side = track(new THREE.MeshBasicMaterial({ color: '#18191b' }));
              const front = track(new THREE.MeshBasicMaterial({ map: coverTexture }));
              const tape = new THREE.Mesh(track(new THREE.BoxGeometry(size.x, size.y, 0.16)), [
                side,
                side,
                side,
                side,
                front,
                side,
              ]);
              // Première page de chaque baie, alignée sur les trois rayons photographiés.
              const slot = videoClubTapeSlot(bayIndex, index);
              const position = portalWorldPosition({ x: slot.x, y: slot.y - 49 / 941 });
              tape.position.set(position.x, position.y, -5.92);
              tape.rotation.y = (-7 * Math.PI) / 180;
              objects.add(tape);
            }),
          ),
        );
      }
      return { scene, group, objects };
    })();
    rooms.set(id, promise);
    void promise.catch(() => rooms.delete(id));
    return promise;
  }

  function schedule() {
    if (!frame && !disposed) frame = requestAnimationFrame(draw);
  }

  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.fov =
      camera.aspect > 1672 / 941
        ? THREE.MathUtils.radToDeg(
            2 * Math.atan((Math.tan(THREE.MathUtils.degToRad(26)) * (1672 / 941)) / camera.aspect),
          )
        : 52;
    camera.updateProjectionMatrix();
    destinationCamera.projectionMatrix.copy(camera.projectionMatrix);
    destinationCamera.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    target.setSize(size.x, size.y);
    uniforms.resolution.value.copy(size);
    schedule();
  }

  function draw(now: number) {
    frame = 0;
    if (disposed || !current) return;
    if (!traveling) {
      anchor = {
        x: anchor.x + (wantedAnchor.x - anchor.x) * 0.25,
        y: anchor.y + (wantedAnchor.y - anchor.y) * 0.25,
      };
    }
    const location = portalWorldPosition(anchor);
    const targetPose = worldDestination();
    openness += (wantedOpen - openness) * 0.12;
    uniforms.opening.value = openness;
    uniforms.time.value = now / 1000;
    portal.position.set(location.x, location.y, location.z);
    portal.visible = openness > 0.005;
    let crossed = false;
    if (traveling) {
      const pose = worldTravel((now - started) / WORLD_TRAVEL_MS, anchor, travelStart);
      camera.position.set(pose.x, pose.y, pose.z);
      camera.quaternion.identity();
      crossed = pose.crossed;
      canvas.dataset['travelProgress'] = pose.progress.toFixed(3);
    } else {
      camera.position.set(0, 0, 4);
      camera.quaternion.identity();
    }
    if (destination) {
      destination.group.position.set(targetPose.x, targetPose.y, targetPose.z);
      destination.group.quaternion.identity();
      // Le cadrage canonique évite d'exposer des faces absentes de la photographie.
      // La même caméra sert à l'aperçu et après le seuil, jusqu'au changement de repère.
      const destinationView = worldDestinationCamera();
      destinationCamera.position.set(destinationView.x, destinationView.y, destinationView.z);
      destinationCamera.quaternion.identity();
      renderer.setRenderTarget(target);
      renderer.render(destination.scene, destinationCamera);
      renderer.setRenderTarget(null);
    }
    if (crossed && destination) renderer.render(destination.scene, destinationCamera);
    else renderer.render(current.scene, camera);
    if (traveling && now - started >= WORLD_TRAVEL_MS && destination && destinationId) {
      current.scene.remove(portal);
      current = destination;
      current.objects.visible = false;
      currentId = destinationId;
      current.group.position.set(0, 0, 0);
      current.group.quaternion.identity();
      current.scene.add(portal);
      destination = null;
      destinationId = null;
      camera.position.set(0, 0, 4);
      camera.quaternion.identity();
      wantedOpen = 0;
      openness = 0;
      portal.visible = false;
      traveling = false;
      canvas.dataset['travelProgress'] = '0';
      onArrival(currentId);
      onTravel(false);
      renderer.render(current.scene, camera);
    }
    if (traveling || openness > 0.006 || wantedOpen > 0) schedule();
  }

  async function preview(id: SandboxRoomId, point: WorldAnchor) {
    if (id === currentId || disposed || traveling || entering) return;
    const request = ++version;
    wantedAnchor = point;
    const next = await roomScene(id);
    if (request !== version) return;
    if (destination) destination.group.position.set(0, 0, 0);
    // Le curseur peut avoir bougé pendant le chargement de la photographie.
    anchor = wantedAnchor;
    destination = next;
    destination.objects.visible = true;
    destinationId = id;
    wantedOpen = 1;
    schedule();
  }

  function cancel() {
    version++;
    traveling = false;
    entering = false;
    wantedOpen = 0;
    openness = 0;
    if (destination) destination.group.position.set(0, 0, 0);
    destination = null;
    destinationId = null;
    camera.position.set(0, 0, 4);
    camera.quaternion.identity();
    canvas.dataset['travelProgress'] = '0';
    onTravel(false);
    schedule();
  }

  const resizeObserver = new ResizeObserver(resize);
  try {
    current = await roomScene(initial);
    current.objects.visible = false;
    current.scene.add(portal);
    resizeObserver.observe(canvas);
    resize();
  } catch (error) {
    disposed = true;
    resources.forEach((resource) => {
      resource.dispose();
    });
    renderer.dispose();
    throw error;
  }
  return {
    preview,
    async enter(id, point) {
      if (traveling || entering || id === currentId) return;
      entering = true;
      const request = ++version;
      let next: RoomScene;
      try {
        next = await roomScene(id);
      } catch (error) {
        entering = false;
        throw error;
      }
      if (disposed || request !== version) return;
      if (destination) destination.group.position.set(0, 0, 0);
      anchor = point;
      wantedAnchor = point;
      destination = next;
      destination.objects.visible = true;
      destinationId = id;
      entering = false;
      traveling = true;
      Object.assign(travelStart, camera.position);
      wantedOpen = 1;
      openness = 1;
      started = performance.now();
      onTravel(true);
      schedule();
    },
    leave() {
      if (!traveling && !entering) {
        version++;
        wantedOpen = 0;
        schedule();
      }
    },
    look() {
      // Conserver la même projection du décor lorsque le curseur déplace l'ouverture.
      return;
    },
    aim(point) {
      if (traveling || entering) return;
      wantedAnchor = point;
      schedule();
    },
    cancel,
    dispose() {
      disposed = true;
      version++;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      resources.forEach((resource) => {
        resource.dispose();
      });
      renderer.dispose();
      // Le canvas est réutilisé lors des changements de préférence et du retour navigateur.
      // Libérer les ressources sans perdre son contexte permet de recréer le renderer.
    },
  };
}
