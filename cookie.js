class Cookies {
    /**
     * Creates a Cookie Object for a Single Host
     * @param {string} host 
     * @returns {Cookies}
     */
	constructor(host) {
		this.host = host;
		this.cookie = {};
		return this;
    };
    /**
     * Adds Cookie as Object 
     * @param {string} cookie 
     * @returns {Cookies}
     */
	addCookie(cookie) {
		const copy = cookie;
		let [key] = copy.split('=');
		if (!!key) {
			this.cookie[key] = cookie;	
		}
		return this;
    };
    /**
     * You can just access it with 'host' aswell, just JS Style
     * @returns {string}
     */
	getHost() {
		return this.host;
    };
    /**
     * the ToString overrider
     * @returns {string}
     */
	toString() {
		let out = [];
		for (let k in this.cookie) {
			out.push(this.cookie[k]);
		}
		return out.join('; ');
	};
};

module.exports = Cookies;