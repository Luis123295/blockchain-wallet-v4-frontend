import qs from 'qs'
import { find, propEq } from 'ramda'

import utils from './utils'
import constants from './constants'

/**
 * Installs an application onto device
 * @async
 * @param {Transport} transport - The opened device transport
 * @param {String} baseUrl - Base url of socket connection
 * @param {String | Number} targetId - The targetId of the device
 * @param {String} appName - The app to install (BTC, BCH, ETH)
 * @param {Object} appInfos - The latest info/versions for applications
 * @returns {Promise} Returns install result as a Promise
 */
const installApp = (transport, baseUrl, targetId, appName, appInfos) => {
  return new Promise(async (resolve, reject) => {
    // derive latest app info
    const latestAppInfo = find(propEq('app', constants.appIds[appName]))(
      appInfos
    )
    // socket params
    const params = {
      targetId,
      perso: latestAppInfo.perso,
      deleteKey: latestAppInfo.delete_key,
      firmware: latestAppInfo.firmware,
      firmwareKey: latestAppInfo.firmware_key,
      hash: latestAppInfo.hash
    }
    // build socket url
    const url =
      `${baseUrl}${constants.socketPaths.install}` + `?${qs.stringify(params)}`

    // install app via socket
    const res = await utils.mapSocketError(
      utils.createDeviceSocket(transport, url).toPromise()
    )

    if (res.err) {
      reject(res.errMsg)
    } else {
      resolve()
    }
  })
}

export default {
  installApp
}