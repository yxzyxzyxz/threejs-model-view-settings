import Vue from 'vue'
import App from './App.vue'
import './assets/styles/global.scss'
import router from './router'
import 'ant-design-vue/dist/antd.css';

import { Upload, Icon, Slider, Button, Progress, Radio, Switch, InputNumber } from 'ant-design-vue';
Vue.use(Button);
Vue.use(Progress);
Vue.use(Switch);
Vue.use(Radio);
Vue.use(Slider);
Vue.use(InputNumber);
Vue.use(Icon);
Vue.use(Upload);


Vue.config.productionTip = false

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
