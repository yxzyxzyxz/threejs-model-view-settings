
import axios from '../config'


export default {
  //获取某个3D的详情
  getResourcelib(id) {
    return axios.get(`https://resourcelibserver.lessonplan.cn:8611/third-d/find/${id}`)
  },
  //修改某个3D
  updateResourcelib(data) {
    return axios.put(`https://resourcelibserver.lessonplan.cn:8611/third-d/config`,data)
  },
}