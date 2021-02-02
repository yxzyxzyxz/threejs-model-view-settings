import axios from 'axios'
import { message } from 'ant-design-vue'

const instance = axios.create({ timeout: 1000 * 20 })

const errorHandler = errMessage => {
  message.error(errMessage)
}

// 取消重复请求
const pending = []
const cancelToken = axios.CancelToken
const removePending = config => {
  pending.forEach((item, index) => {
    if(item.requestFlag === config.url + '&' + config.method) {
      item.cancel('取消重复请求')
      pending.splice(index, 1)
    }
  })
}

// http request 拦截器
instance.interceptors.request.use( 
  request => {
    removePending(request)

    request.cancelToken = new cancelToken(cancel => {
      const requestFlag = request.url + '&' + request.method
      pending.push({requestFlag, cancel})
    })

    return request
  },
  error => {
    return Promise.reject(error)
  }
)

// http response 拦截器
instance.interceptors.response.use(
  response => {
    if( response.status >= 200 && response.status < 400 ) {
      return Promise.resolve(response.data)
    }

    errorHandler('未知的请求错误！')
    return Promise.reject(response)
  },
  error => {
    if(error && error.response) {
      if( error.response.status >= 400 && error.response.status < 500 ) {
        errorHandler('请求错误！')
        return Promise.reject(error.message)
      }
      else if( error.response.status >= 500) {
        errorHandler('服务器错误！')
        return Promise.reject(error.message)
      }
      
      errorHandler('服务器遇到未知错误！')
      return Promise.reject(error.message)
    }
    
    if(error.message === '取消重复请求') {
      errorHandler('您的操作过于频繁！')
      return Promise.reject(error)
    }

    errorHandler('连接到服务器失败 或 服务器响应超时！')
    return Promise.reject(error)
  }
)

export default instance