import React, { useRef, useEffect } from 'react';
import styles from './index.module.scss';
import {
  Mesh, Scene, WebGLRenderer, Clock, PlaneBufferGeometry, PerspectiveCamera, TextureLoader,
   MeshBasicMaterial, MeshPhysicalMaterial, SpotLight, sRGBEncoding, Box3, Vector3, Group, Uniform, Shader, Object3D,
} from 'three';
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';

type Object3DWidthInitPos = Object3D & {initPos:number};

class World {
  private scene: Scene;
  private camera: PerspectiveCamera;
  private timer = 0;
  private renderer: WebGLRenderer;
  private clock = new Clock();
  private loader = new TextureLoader();

  private objLoader = new OBJLoader();
  private controls :OrbitControls;
  private buildindGroup = new Group();

  private time = new Uniform(-1);
  constructor(container: HTMLDivElement) {
    const { offsetWidth: width, offsetHeight: height } = container;
    this.renderer = new WebGLRenderer();
    this.renderer.setClearColor(0x222222);
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    // this.renderer.physicallyCorrectLights = true;
    this.renderer.outputEncoding = sRGBEncoding;
    container.append(this.renderer.domElement);

    this.camera = new PerspectiveCamera(20, width / height, 1, 1000);
    this.camera.position.set(-80, 50, 80);
    this.camera.lookAt(0, 0, 0);
    this.scene = new Scene();

    this.controls = new OrbitControls(this.camera,this.renderer.domElement);
    this.controls.maxPolarAngle = Math.PI/2;

    const spotLight = new SpotLight(0xffffff,1);
    spotLight.position.set(0,50,30);
    spotLight.castShadow = true;
    this.scene.add(spotLight);

    const row = 17;
    const col = 25;
    const geometry = new PlaneBufferGeometry(60,60);
    const material = new MeshPhysicalMaterial({color:0x123456})
    const plane = new Mesh(geometry,material);
    plane.rotateX(-Math.PI/2);
    plane.receiveShadow = true;
    this.scene.add(plane);

    const geometry2 = new PlaneBufferGeometry(1000,1000);
    const material2 = new MeshBasicMaterial({color:0x222222})
    const plane1 = new Mesh(geometry2,material2);
    plane1.rotateX(-Math.PI/2);
    plane1.position.y-=0.01;
    plane1.receiveShadow = true;
    this.scene.add(plane1);

    const material1 = new MeshPhysicalMaterial({
      color:'rgb(90,90,80)',
      roughness:0.5,
      metalness:0.5,
    });

    const replaceShader = (shader:Shader) =>{
      shader.uniforms.time = this.time;


      shader.vertexShader = [
        'varying vec3 vWorldPosition;',
        shader.vertexShader
      ].join('\n'); 
      const strVert = [
        'vWorldPosition = worldPosition.xyz;',
        '}',
      ].join('\n');
      shader.vertexShader = shader.vertexShader.replace(
        '}',
        strVert,
      )
      const params = [
        'uniform float time;',
        'varying vec3 vWorldPosition;',
      ].join('\n');
      shader.fragmentShader =params + '\n' + shader.fragmentShader;

      const strFrag = [
        'float width = 2.;',
        'float dist = length(vec2(vWorldPosition.x,vWorldPosition.z));',
        'float ratio = step(time-width,dist)*step(dist,time+width);',
        'ratio *= smoothstep(time-width,time,dist) * smoothstep(time,time+width,dist) ;',
        'vec3 col = outgoingLight + vec3(0.,1.,1.) * ratio;',
        'gl_FragColor = vec4( col, diffuseColor.a );',
      ].join('\n');
      shader.fragmentShader = shader.fragmentShader.replace(
        'gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
        strFrag,
      )
    }

    material1.onBeforeCompile = replaceShader;
    material.onBeforeCompile = replaceShader;
    

    this.objLoader.loadAsync('https://raw.githubusercontent.com/iondrimba/images/master/buildings.obj')
      .then(objs=>{
        const scale = 0.01;
        const samples = objs.children;
        const length = objs.children.length;
        const box = new Box3();
        const gap = 2;
        const a = new Vector3();

        for(let i = 0;i<row;i++){
          for(let j = 0;j<col;j++){
            const index = Math.floor(Math.random() * length/2); // divide 2 to limit building's kind
            const model = samples[index].clone();
            model.receiveShadow = true;
            model.castShadow = true;
            (model as Mesh).material = material1
            model.scale.set(scale,scale,scale);
            box.setFromObject(model).getSize(a);
            const initPos = -a.y - ((i-row/2)**2+(j-col/2)**2 )/10;
            model.position.set((i - row/2) * gap,initPos,(j - col/2) * gap);
            (model as Object3DWidthInitPos).initPos = initPos;
            this.buildindGroup.add(model);
          }
        }
        this.buildindGroup.position.x -=7;
        this.scene.add(this.buildindGroup);
      })

  }
  private reset = () =>{
    this.clock  = new Clock();
    this.buildindGroup.children.forEach(child=>{
      child.position.y = (child as Object3DWidthInitPos).initPos;
    })
  }
  public draw = () => {
    let time = 0;
    if(this.buildindGroup.children.length){
      time = this.clock.getElapsedTime();
    }
    this.time.value = time * 18;
    this.controls.update();
    this.buildindGroup.children.forEach(child=>{
      if(child.position.y < 0){
        child.position.y+=0.2;
      }
    })

    if(time>3){
      this.reset();
    }

    this.renderer.render(this.scene, this.camera);

    this.timer = requestAnimationFrame(this.draw);
  }
  public dispose = () => {
    cancelAnimationFrame(this.timer);
  }
}

export const App = () => {
  const ref = useRef<HTMLDivElement>(null);
  const refWorld = useRef<World>();
  useEffect(() => {
    if (!ref.current) { return }
    const container = ref.current;
    refWorld.current = new World(container);
    refWorld.current.draw();
    return () => refWorld.current?.dispose();
  }, [ref])

  return <div
    ref={ref}
    className={styles.container}
  />
}