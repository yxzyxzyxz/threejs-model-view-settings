import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
  {
    path: '/home/:id',
    name: 'home',
    component: () => import(/* webpackChunkName: "home" */ '@/views/Home'),
  },
  {
    path: '/editor/:id',
    name: 'editor',
    component: () => import(/* webpackChunkName: "editor" */ '@/views/Editor'),
  },
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
