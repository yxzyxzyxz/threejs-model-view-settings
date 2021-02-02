<template>
  <div id="main">
    <div class="progress" v-show="percent<100">
      <a-progress :percent="percent" status="active" :strokeColor="'#e86b99'" />
    </div>
    <div id="box" class="box" style="overflow: hidden;"></div>
  </div>
</template>
<script>
import api from '@/services'
import * as THREE from 'three'
//加载3d模型
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
//控制器
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { OBJLoader2 } from 'three/examples/jsm/loaders/OBJLoader2.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import { MtlObjBridge } from 'three/examples/jsm/loaders/obj2/bridge/MtlObjBridge.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
export default {
  name: 'app',
  props: {},
  data() {
    return {
      percent: 0,
      renderer: null,
      scene: null,
      camera: null,
      controls: null,
      mixer: null,
      clock: null,
      model: null,
      gltf: null,
      ele: null,
      haveAnimations: false,
      modelId: '',
      model: {
        path: '',
        mtlPath: '',
        id: null,
        type: '',
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
      controlsConfig: {
        x: 4,
        y: 4,
        z: 4,
        isAnimationPlay: true,
      },
    }
  },

  components: {},
  computed: {},
  beforeMount() {},
  async mounted() {
    window.addEventListener('message', this.getMessage)
    this.modelId = this.$route.params.id
    await api.resourcelib.getResourcelib(this.modelId).then((res) => {
      res.path = `https://file.lessonplan.cn/` + res.path
      res.mtlPath = `https://file.lessonplan.cn/` + res.mtlPath
      this.model = res
    })
    this.init()
    window.addEventListener('resize', this.onWindowResize, false)
  },
  methods: {
    init() {
      this.scene = new THREE.Scene()
      this.ele = document.getElementById('box')
      let width = this.ele.clientWidth
      let height = this.ele.clientHeight
      this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000) //视角 宽高比 近平面距离
      this.clock = new THREE.Clock()
      this.camera.position.set(4, 4, 4) //相机的位置
      this.camera.lookAt(0, 1, 0)
      //创建渲染器
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        maxLights: 10,
      })
      this.renderer.setSize(width, height)
      this.renderer.gammaOutput = this.config.gammaOutput
      this.renderer.gammaFactor = 2.2
      this.renderer.toneMappingExposure = this.config.toneMappingExposure
      this.ele.appendChild(this.renderer.domElement)
      let dirlight = new THREE.AmbientLight(
        '#fff',
        this.config.ambientIntensity
      )
      this.scene.add(dirlight)
      let dirlight2 = new THREE.DirectionalLight(
        '#fff',
        this.config.directIntensity
      )
      dirlight2.position.set(200, 200, 200)
      this.scene.add(dirlight2)
      this.controls = this.initControls()
      this.camera.position.set(
        this.controlsConfig.x,
        this.controlsConfig.y,
        this.controlsConfig.z
      )
      if (this.config.autoRotate) {
        this.controls.autoRotate = true
      }
      if (this.model.type == 'gltf') {
        this.loadGltfModel()
      } else if (this.model.type == 'obj') {
        this.loadObjModel()
      } else if (this.model.type == 'fbx') {
        this.loadFbxModel()
      }
    },
    getMessage({ configs }) {
      if (configs) {
        this.controlsConfig = {
          x: configs.x || 4,
          y: configs.y || 4,
          z: configs.z || 4,
          isAnimationPlay: configs.isAnimationPlay || true,
        }
      }
    },
    updateConfig() {
      window.parent.postMessage(
        {
          command: 'updateConfigs',
          configs: this.controlsConfig,
        },
        '*'
      )
    },
    loadGltfModel() {
      let loader = new GLTFLoader()
      loader.load(
        this.model.path,
        (gltf) => {
          this.model = gltf.scene
          this.setScaleToFitSize(this.model)
          this.scene.add(this.model)
          if (gltf.animations.length > 0) {
            this.haveAnimations = true
            this.mixer = new THREE.AnimationMixer(this.model)
            let clip = gltf.animations[0]
            this.model.clipAction = this.mixer.clipAction(clip.optimize())
            if (this.controlsConfig.isAnimationPlay) {
              this.model.clipAction.play()
            }
            this.ele.addEventListener('click', this.onMouseClick, false)
          }
          this.draw()
        },
        (xhr) => {
          this.percent = +((xhr.loaded / xhr.total) * 100).toFixed(2)
        },
        (error) => {}
      )
    },
    loadObjModel() {
      let objLoader2 = new OBJLoader2()
      let onLoadMtl = (mtlParseResult) => {
        objLoader2.setModelName('eyeball')
        objLoader2.setLogging(true, true)
        objLoader2.addMaterials(
          MtlObjBridge.addMaterialsFromMtlLoader(mtlParseResult),
          true
        )
        objLoader2.load(
          this.model.path,
          (object3d) => {
            object3d.castShadow = true
            object3d.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.material.emissive = new THREE.Color(1, 1, 1)
                child.material.emissiveIntensity = 1
                child.material.emissiveMap = child.material.map
              }
            })
            this.setScaleToFitSize(object3d)
            this.scene.add(object3d)
            this.draw()
          },
          (xhr) => {
            this.percent = (xhr.loaded / xhr.total) * 100
          },
          null,
          null
        )
      }
      let mtlLoader = new MTLLoader()
      mtlLoader.load(this.model.mtlPath, onLoadMtl)
    },
    loadFbxModel() {
      let loader = new FBXLoader()
      loader.load(this.model.path, (object) => {
        this.setScaleToFitSize(object)
        this.scene.add(object)
        this.draw()
      })
    },
    initControls() {
      const controls = new OrbitControls(this.camera, this.renderer.domElement)
      controls.addEventListener('change', (e) => {
        this.controlsConfig.x = this.camera.position.x
        this.controlsConfig.y = this.camera.position.y
        this.controlsConfig.z = this.camera.position.z
        this.updateConfig()
        this.renderer.render(this.scene, this.camera)
      })
      controls.enableDamping = true
      controls.dampingFactor = 0.25
      controls.enablePan = false
      return controls
    },
    onWindowResize() {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    },
    draw() {
      requestAnimationFrame(this.draw)
      const delta = this.clock.getDelta()
      if (this.haveAnimations) {
        this.mixer.update(delta)
      }
      this.controls.update(delta)
      this.renderer.render(this.scene, this.camera)
    },
    render() {
      this.renderer.render(this.scene, this.camera)
    },
    onMouseClick(event) {
      let getBoundingClientRect = this.ele.getBoundingClientRect()
      let x =
        ((event.clientX - getBoundingClientRect.left) / this.ele.offsetWidth) *
          2 -
        1
      let y =
        -((event.clientY - getBoundingClientRect.top) / this.ele.offsetHeight) *
          2 +
        1
      let standardVector = new THREE.Vector3(x, y, 1)
      let worldVector = standardVector.unproject(this.camera)
      let ray = worldVector.sub(this.camera.position).normalize()
      let rayCaster = new THREE.Raycaster(this.camera.position, ray)
      let intersects = rayCaster.intersectObjects(this.scene.children, true)
      if (intersects.length) {
        if (this.model.clipAction.isRunning()) {
          this.controlsConfig.isAnimationPlay = false
          this.model.clipAction.stop()
        } else {
          this.controlsConfig.isAnimationPlay = true
          this.model.clipAction.play()
        }
        this.updateConfig()
      }
    },
    //获取模型适合观察的缩放的比例
    getFitScaleValue(obj) {
      let boxHelper = new THREE.BoxHelper(obj)
      boxHelper.geometry.computeBoundingBox()
      let center = boxHelper.geometry.boundingSphere.center
      let box = boxHelper.geometry.boundingBox
      let maxDiameter = Math.max(
        box.max.x - box.min.x,
        box.max.y - box.min.y,
        box.max.z - box.min.z
      )
      return { center, scale: 4 / maxDiameter }
    },
    //设置模型到适合观察的大小
    setScaleToFitSize(obj) {
      let { center, scale } = this.getFitScaleValue(obj)
      scale = scale * 1.2
      center.setX(obj.position.x - center.x * scale)
      center.setY(obj.position.y - center.y * scale)
      center.setZ(obj.position.z - center.z * scale)
      obj.scale.set(scale, scale, scale)
      obj.position.setX(center.x)
      obj.position.setY(center.y)
      obj.position.setZ(center.z)
    },
  },
  watch: {},
  beforeDestroy() {
    window.removeEventListener('message', this.getMessage)
  },
}
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
}
</style>