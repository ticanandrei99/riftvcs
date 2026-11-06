const webpack=require('webpack'),path=require('path'),CopyPlugin=require('copy-webpack-plugin');
const base=require('../webpack.config.js');
const config={...base,module:{rules:[{test:/\.ts$/,use:{loader:'ts-loader',options:{compilerOptions:{rootDir:process.cwd()}}},exclude:/node_modules/}]},mode:'production',devtool:false,entry:path.resolve('tests/native/hardware.ts'),output:{path:path.resolve('verification/native-qa-dist'),filename:'native-hardware.js',clean:true},plugins:[new CopyPlugin({patterns:[{from:'tests/native/hardware.html',to:'index.html'}]})]};
webpack(config,(error,stats)=>{if(error||stats.hasErrors()){console.error(error||stats.toString({all:false,errors:true}));process.exitCode=1;}else console.log('Built isolated native hardware test page.');});
