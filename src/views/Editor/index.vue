<template>
  <div id="main">
    <div class="progress" v-show="percent < 100">
      <a-progress :percent="percent" status="active" :strokeColor="'#e86b99'" />
    </div>
    <div id="box" class="box" style="overflow: hidden;"></div>
    <div class="editor">
      <div class="item">
        <div class="label">自动旋转:</div>
        <a-switch
          v-model="config.autoRotate"
          checked-children="开"
          un-checked-children="关"
          @change="change('autoRotate', $event)"
        />
      </div>
      <div class="item">
        <div class="label">伽马射线输出:</div>
        <a-switch
          v-model="config.gammaOutput"
          checked-children="开"
          un-checked-children="关"
          @change="change('gammaOutput', $event)"
        />
      </div>
      <div class="item">
        <div class="label">环境光强度:</div>
        <div class="value">
          <a-slider
            :step="0.1"
            @change="change('ambientIntensity', $event)"
            v-model="config.ambientIntensity"
            :min="0"
            :max="2"
          />
          <a-input-number v-model="config.ambientIntensity" :min="0" :max="2" />
        </div>
      </div>
      <div class="item">
        <div class="label">平行光强度:</div>
        <div class="value">
          <a-slider
            :step="0.1"
            @change="change('directIntensity', $event)"
            v-model="config.directIntensity"
            :min="0"
            :max="4"
          />
          <a-input-number v-model="config.directIntensity" :min="0" :max="4" />
        </div>
      </div>
      <div class="item">
        <div class="label">全景图背景:</div>

        <a-switch
          v-model="config.isBackground"
          checked-children="开"
          un-checked-children="关"
          @change="change('isBackground', $event)"
        />
        <div class="value" style="margin-top: 10px;">
          <a-button v-if="config.isBackground" @click="toUpload"
            >上传图片</a-button
          >
          <a-slider
            :step="1"
            v-if="config.isBackground"
            @change="change('backgroundFov', $event)"
            v-model="config.backgroundFov"
            :min="1"
            :max="40"
          />
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import debounce from "@/debounce";
import api from "@/services";
import * as THREE from "three";
//加载3d模型
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
//控制器
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader2 } from "three/examples/jsm/loaders/OBJLoader2.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { MtlObjBridge } from "three/examples/jsm/loaders/obj2/bridge/MtlObjBridge.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
export default {
  name: "app",
  props: {},
  data() {
    return {
      percent: 0,
      renderer: null,
      scene: null,
      camera: null,
      mixer: null,
      clock: null,
      model: null,
      gltf: null,
      ele: null,
      controls: null,
      haveAnimations: false,
      modelId: "",
      controlBtn: [],
      axes: null,
      model: {
        path: "",
        mtlPath: "",
        id: null,
        type: "",
      },
      config: {
        gammaOutput: true,
        ambientIntensity: 0.3,
        directIntensity: 1,
        autoRotate: false,
        isBackground: false,
        background: ``,
        backgroundFov: 20,
      },
      mesh: null,
    };
  },

  components: {},
  computed: {},
  beforeMount() {},
  async mounted() {
    this.modelId = this.$route.params.id;
    // for (let item of model) {
    //   if (this.modelId == item.id) {
    //     this.model = item
    //   }
    // }
    await api.resourcelib.getResourcelib(this.modelId).then((res) => {
      if(res.config){
        this.config=JSON.parse(res.config)
      }
      res.path = `https://file.lessonplan.cn/` + res.path;
      res.mtlPath = `https://file.lessonplan.cn/` + res.mtlPath;
      this.model = res;
    });
    this.init();
    window.addEventListener("resize", this.onWindowResize, false);
  },
  methods: {
    init() {
      this.scene = new THREE.Scene();
      this.ele = document.getElementById("box");
      let width = this.ele.clientWidth;
      let height = this.ele.clientHeight;
      this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000); //视角 宽高比 近平面距离
      this.clock = new THREE.Clock();
      this.camera.position.set(4, 4, 4); //相机的位置
      this.camera.lookAt(0, 1, 0);
      //创建渲染器
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        maxLights: 10,
      });
      this.renderer.setSize(width, height);
      this.renderer.gammaOutput = this.config.gammaOutput;
      this.renderer.gammaFactor = 2.2;
      this.renderer.toneMappingExposure = this.config.toneMappingExposure;
      this.ele.appendChild(this.renderer.domElement);

      let dirlight = new THREE.AmbientLight(
        "#fff",
        this.config.ambientIntensity
      );
      this.scene.add(dirlight);
      let dirlight2 = new THREE.DirectionalLight(
        "#fff",
        this.config.directIntensity
      );
      dirlight2.position.set(200, 200, 200);
      this.scene.add(dirlight2);
      window.scene = this.scene;
      window.renderer = this.renderer;
      if (this.config.isBackground) {
        this.createBackground();
      }

      this.controls = this.initControls();
      if (this.config.autoRotate) {
        this.controls.autoRotate = true;
      }
      window.controls = this.controls;
      if (this.model.type == "gltf") {
        this.loadGltfModel();
      } else if (this.model.type == "obj") {
        this.loadObjModel();
      } else if (this.model.type == "fbx") {
        this.loadFbxModel();
      }
    },
    loadGltfModel() {
      let loader = new GLTFLoader();
      loader.load(
        this.model.path,
        (gltf) => {
          this.model = gltf.scene;
          this.setScaleToFitSize(this.model);
          this.scene.add(this.model);
          if (gltf.animations.length > 0) {
            this.haveAnimations = true;
            this.mixer = new THREE.AnimationMixer(this.model);
            let clip = gltf.animations[0];
            this.model.clipAction = this.mixer.clipAction(clip.optimize());
            this.ele.addEventListener("click", this.onMouseClick, false);
          }
          this.draw();
        },
        (xhr) => {
          this.percent = +((xhr.loaded / xhr.total) * 100).toFixed(2);
        },
        (error) => {}
      );
    },
    loadObjModel() {
      let objLoader2 = new OBJLoader2();
      let onLoadMtl = (mtlParseResult) => {
        objLoader2.setModelName("eyeball");
        objLoader2.setLogging(true, true);
        objLoader2.addMaterials(
          MtlObjBridge.addMaterialsFromMtlLoader(mtlParseResult),
          true
        );
        objLoader2.load(
          this.model.path,
          (object3d) => {
            object3d.castShadow = true;
            object3d.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.material.emissive = new THREE.Color(1, 1, 1);
                child.material.emissiveIntensity = 1;
                child.material.emissiveMap = child.material.map;
              }
            });
            this.setScaleToFitSize(object3d);
            this.scene.add(object3d);
            this.draw();
          },
          (xhr) => {
            this.percent = (xhr.loaded / xhr.total) * 100;
          },
          null,
          null
        );
      };
      let mtlLoader = new MTLLoader();
      mtlLoader.load(this.model.mtlPath, onLoadMtl);
    },
    save() {
      debounce(() => {
        api.resourcelib
          .updateResourcelib({
            config: JSON.stringify(this.config),
            id: this.modelId,
          })
         
      }, 1000);
    },
    loadFbxModel() {
      let loader = new FBXLoader();
      loader.load(this.model.path, (object) => {
        this.setScaleToFitSize(object);
        this.scene.add(object);
        this.draw();
      });
    },
    toUpload() {
      this.config.background = `/images/puydesancy.jpg`;
      if (this.mesh) {
        this.removeBackground();
      }
      this.createBackground();
    },
    createBackground() {
      let geometry = new THREE.SphereBufferGeometry(1, 200, 200);
      geometry.scale(
        -this.config.backgroundFov,
        this.config.backgroundFov,
        this.config.backgroundFov
      );

      let material = new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader().load(this.config.background),
      });
      this.mesh = new THREE.Mesh(geometry, material);
      this.scene.add(this.mesh);
      window.mesh = this.mesh;
    },
    removeBackground() {
      this.scene.remove(this.mesh);
      this.mesh = null;
    },
    change(type, value) {
      this.config[type] = value;
      if (type == "gammaOutput") {
        this.renderer.gammaOutput = value;
      }
      if (type == "ambientIntensity") {
        for (let item of this.scene.children) {
          if (item.type == "AmbientLight") {
            item.intensity = value;
          }
        }
      }
      if (type == "directIntensity") {
        for (let item of this.scene.children) {
          if (item.type == "DirectionalLight") {
            item.intensity = value;
          }
        }
      }
      if (type == "autoRotate") {
        this.controls.autoRotate = value;
      }
      if (type == "isBackground") {
        if (this.config.background) {
          if (value) {
            this.createBackground();
          } else {
            this.removeBackground();
          }
        }
      }
      if (type == "backgroundFov") {
        this.removeBackground();
        this.createBackground();
      }
      this.save();
    },
    handleFileChange(e) {},

    initControls() {
      const controls = new OrbitControls(this.camera, this.renderer.domElement);
      controls.addEventListener("change", () => {
        this.renderer.render(this.scene, this.camera);
      });
      controls.enableDamping = true;
      controls.dampingFactor = 0.25;
      controls.enablePan = false;
      return controls;
    },
    onWindowResize() {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    },
    draw() {
      requestAnimationFrame(this.draw);
      const delta = this.clock.getDelta();
      if (this.haveAnimations) {
        this.mixer.update(delta);
      }
      this.controls.update(delta);
      this.renderer.render(this.scene, this.camera);
    },
    render() {
      this.renderer.render(this.scene, this.camera);
    },
    onMouseClick(event) {
      let mouse = new THREE.Vector2();
      let raycaster = new THREE.Raycaster();
      let getBoundingClientRect = this.ele.getBoundingClientRect();
      let x =
        ((event.clientX - getBoundingClientRect.left) / this.ele.offsetWidth) *
          2 -
        1;
      let y =
        -((event.clientY - getBoundingClientRect.top) / this.ele.offsetHeight) *
          2 +
        1;
      let standardVector = new THREE.Vector3(x, y, 1);
      let worldVector = standardVector.unproject(this.camera);
      let ray = worldVector.sub(this.camera.position).normalize();
      let rayCaster = new THREE.Raycaster(this.camera.position, ray);
      let intersects = rayCaster.intersectObjects(this.scene.children, true);
      if (intersects.length) {
        if (this.model.clipAction.isRunning()) this.model.clipAction.stop();
        else this.model.clipAction.play();
      }
    },
    //获取模型适合观察的缩放的比例
    getFitScaleValue(obj) {
      let boxHelper = new THREE.BoxHelper(obj);
      boxHelper.geometry.computeBoundingBox();
      let center = boxHelper.geometry.boundingSphere.center;
      let box = boxHelper.geometry.boundingBox;
      let maxDiameter = Math.max(
        box.max.x - box.min.x,
        box.max.y - box.min.y,
        box.max.z - box.min.z
      );
      return { center, scale: this.camera.position.z / maxDiameter };
    },
    //设置模型到适合观察的大小
    setScaleToFitSize(obj) {
      let { center, scale } = this.getFitScaleValue(obj);
      scale = scale * 1.2;
      center.setX(obj.position.x - center.x * scale);
      center.setY(obj.position.y - center.y * scale);
      center.setZ(obj.position.z - center.z * scale);
      obj.scale.set(scale, scale, scale);
      obj.position.setX(center.x);
      obj.position.setY(center.y);
      obj.position.setZ(center.z);
    },
  },
  watch: {},
};
</script>
<style lang='scss' scoped>
#main {
  height: 100%;
  position: relative;
  .progress {
    position: absolute;
    top: 10px;
    padding: 0 20px;
    width: 100%;
  }
  .box {
    height: 100%;
    width: 100%;
  }
  .control {
    position: absolute;
    width: 100%;
    left: 0;
    bottom: 30px;
    text-align: center;
    button {
      margin: 0 6px;
    }
  }
  .editor {
    padding: 20px;
    position: absolute;
    background: #1a1a1a;
    right: 0;
    top: 0;
    color: #fff;
    width: 260px;
    max-height: 100%;
    overflow-y: auto;
    .item {
      margin-bottom: 10px;
      border-bottom: 1px solid #fff;
      padding-bottom: 10px;
    }
    .label {
      margin-bottom: 10px;
    }
    .value {
      display: flex;
    }
  }
}
::v-deep .ant-slider {
  flex: 1;
}
::v-deep .ant-input-number {
  width: 60px;
}
</style>