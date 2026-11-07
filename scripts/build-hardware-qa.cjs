const webpack=require('webpack'),path=require('path'),CopyPlugin=require('copy-webpack-plugin');
const base=require('../webpack.config.js');
const resultUrl=process.env.RIFTVOICE_QA_RESULT_URL||'http://127.0.0.1:9415/result';
if(!/^http:\/\/127\.0\.0\.1:\d+\/result(?:\?run=[a-f0-9]+)?$/.test(resultUrl))throw Error('Hardware results must stay on loopback');
const config={...base,module:{rules:[{test:/\.ts$/,use:{loader:'ts-loader',options:{compilerOptions:{rootDir:process.cwd()}}},exclude:/node_modules/}]},mode:'production',devtool:false,entry:path.resolve('tests/native/hardware.ts'),output:{path:path.resolve('verification/native-qa-dist'),filename:'hardware/native-hardware.js',clean:true},plugins:[new CopyPlugin({patterns:[{from:'tests/native/hardware.html',to:'hardware/index.html'}]})]};
config.plugins.push(new webpack.DefinePlugin({__VOXDRIA_QA_RESULT_URL__:JSON.stringify(resultUrl)}));
webpack(config,(error,stats)=>{if(error||stats.hasErrors()){console.error(error||stats.toString({all:false,errors:true}));process.exitCode=1;}else console.log('Built isolated native hardware test page.');});
