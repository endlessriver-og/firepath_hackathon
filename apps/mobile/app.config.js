// Static web export is served under /app/ in the demo build; native builds and `expo start` ignore this.
module.exports = ({ config }) => ({ ...config, experiments: { ...config.experiments, baseUrl: process.env.FIREPATH_WEB_BASE || '' } });
