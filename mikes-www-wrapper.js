const https = require('https');
const querystring = require('querystring');
const Cookies = require('./cookie');
let globalCookies = [];

/**
 * The Cookie Wrapper Add Function
 * @param {string} host 
 * @param {string} cookie 
 */
function addCookie(host, cookie) {
	const cookieIndex = globalCookies.findIndex(v => v.getHost() === host);
	if (cookieIndex !== -1) {
		globalCookies[cookieIndex].addCookie(cookie);
		return;
	}
	const baker = new Cookies(host);
	baker.addCookie(cookie);
	globalCookies.push(baker);
}

/**
 * The Cookie Wrapper Get Function
 * @param {string} host 
 * @returns {string}
 */
function getCookie(host) {
	const cookieIndex = globalCookies.findIndex(v => v.getHost() === host);
	if (cookieIndex !== -1) {
		return globalCookies[cookieIndex].toString();
	}
	return null;
}

/**
 * Deletes a Cookie Associated to an Host
 * @param {string} host 
 */
function removeCookie(host) {
	let newCookieArray = [];
	for (let i = globalCookies.length - 1; i; i--) {
		if (globalCookies[i].getHost() === host) {
			continue;
		}
		newCookieArray.push(globalCookies[i]);
	}
	globalCookies = []; // wir haben einen GC ¯\_(ツ)_/¯
	globalCookies = newCookieArray;
}

/**
 * Clears all saved Cookies
 */
function clearCookies() {
	for (let i = globalCookies.length - 1; i; i--) {
		delete globalCookies[i];
	}
	globalCookies = [];
}

/**
 * It splits an Uri Request to an Map
 * @param {string} str 
 * @returns {Map<string, string>}
 */
function uriToMap(str) {
    let params = {};
	const pushFunc = v => {
		let [key, value] = v.split('=');
		params[key] = value;
	};
	if (!!str) {
        str.split('&').forEach(pushFunc);
	}
	return params;
}

/**
 * @typedef RequestObject
 * @property {string} host
 * @property {Map<string, string>} headers
 * @property {string} method
 */

/**
 * @typedef ResponseObject
 * @property {number} code
 * @property {Buffer} content
 * @property {Map<string, string>} headers
 */

/**
 * Extracts the Request Options out of the url and adds Cookies to the Request
 * @param {'get' | 'post'} method 
 * @param {string} url 
 * @returns {RequestObject}
 */
function extractRequestOptions(method, url, content) {
	let uri;
	[url, uri] = url.split('?');
	let buffer;
	[buffer, url] = url.split('://');
	if (!url) {
		url = buffer;
    }
    if (!url) {
        throw new Error('Invalid URL Request');
    }
	let params = uriToMap(uri);
	const parts = url.split('/');
	url = parts.splice(0, 1)[0];
	let port = null;
	buffer = url.split(':');
	if (!!buffer[1]) {
		port = buffer[1];
	}
	uri = parts.join('/');
	const prams = querystring.stringify(params);
	if (!!prams) {
		uri += '?' + prams;	
	}
	let reqObject = { host: url, path: '/' + uri, headers: {} };
	if (!!port) {
		reqObject.port = port;
	}
	const cookie = getCookie(url);
	if (!!cookie) {
		reqObject.headers['Cookie'] = cookie;
	}
	if (method.toLowerCase() === 'post') {
		reqObject.method = 'POST';
		if (!!content) {
			reqObject.headers['Content-Type'] = 'application/x-www-form-urlencoded';
			reqObject.headers['Content-Length'] = content.length;
		}
	} 		
	return reqObject;
}

/**
 * The Request Object Wrapper for JavaScripts XML HTTP Request / NodeJS http(s) Module
 * @param {RequestObject} requestObject 
 * @param {any} content 
 * @param {function(ResponseObject): void} [callback] 
 * @returns {Promise<ResponseObject> | void} Returns void if callback is defined
 */
function request(requestObject, content, callback) {
    let dataStr = [];
    /**
     * It gathers the response Chunks of http data event
     * @param {string} chunk 
     */
	const receiveData = chunk => {
		const b = Buffer.from(chunk);
		dataStr.push(b);
    };
    /**
     * The HTTP Request Promise Handler
     * @param {function(ResponseObject): void} handler 
     */
	const promiseHandler = handler => {
		const responseHandler = (response) => {
			const onDataReceived = () => {
				const cookie = response.headers['set-cookie'];
				if (!!cookie) {
					cookie.forEach(v => {
						addCookie(requestObject.host, v);
					});
				}
				const res = {
					headers: response.headers,
					code: response.statusCode,
					content: Buffer.concat(dataStr),
				};
				handler(res);
			};
			response.on('data', receiveData);
			response.on('end', onDataReceived);
		};
		const result = https.request(requestObject, responseHandler);
		if (!!content) {
			result.write(content);
		}
		result.end();
	};
	const result = new Promise(promiseHandler);
	if (typeof callback === 'function') {
		result.then(callback);
	}
	return result;
}

/**
 * The Get Request Wrapper
 * @param {string} url 
 * @param {function(ResponseObject): void} [callback] 
 * @returns {Promise<ResponseObject> | void} Returns void if callback is defined
 */
function get(url, params, callback) {
	return request(extractRequestOptions('get', url), params, callback);
};

/**
 * The Post Request Wrapper
 * @param {string} url 
 * @param {any} params It will be stringified
 * @param {function(ResponseObject): void} [callback] 
 * @returns {Promise<ResponseObject> | void} Returns void if callback is defined
 */
function post(url, params, callback) {
	let content = params;
	if (typeof params === 'object') {
		content = querystring.stringify(params);
	}
	return request(extractRequestOptions('post', url, content), content, callback);
};

module.exports = {
	get: get,
	post: post,
	request: request,
	extractRequestOptions: extractRequestOptions,
	addCookie: addCookie,
	getCookie: getCookie,
	clearCookies: clearCookies,
	removeCookie: removeCookie,
	https: https,
	querystring: querystring,
};