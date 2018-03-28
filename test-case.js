let fs = require('fs');
let path = require('path');
let ReadStream = require('./ReadStream.js');

let rs = new ReadStream(path.join(__dirname,'1.txt'),{
  highWaterMark:3
  ,flags:'r'
  ,encoding:'utf8'
  ,mode:0o666
  ,autoClose:true
  ,start:0
  ,end:5
});

rs.on('open',function(fd){
  console.log('fd:',fd); //3 应该是fd
  console.log('open');
})

rs.on('data',function(data){
  console.log(data);
  // rs.pause();
})

rs.on('error',function(err){
  console.log('error:',err)
})

rs.on('end',function(){
  console.log('end');
})

rs.on('close',function(){
  console.log('close');
})


//--- --- ---

let fs = require('fs');
let path = require('path');
let WriteStream = require('./WriteStream.js');

let ws = new WriteStream(path.join(__dirname,'2.txt'),{
  highWaterMark:3
  ,flags:'w'
  ,encoding:'utf8'
  ,mode:0o666
  ,autoClose:true
  ,start:0
});

// let flag = ws.write(1+''); //true
// console.log(flag);
let index = 9
,flag = true

function write(){
  while(flag&&index){
    console.log(index);
    flag = ws.write(index--+'','utf8',()=>{console.log('ok')});
    console.log(flag);
  }
 
}
ws.on('drain',()=>{
  flag = true;
  write();
})
write();


//--- --- ---
let fs = require('fs');
let path = require('path');
let WriteStream = require('./WriteStream.js');
let ReadStream = require('./ReadStream.js');

// let rs = fs.createReadStream(path.join(__dirname,'1.txt'));
// let ws = fs.createWriteStream(path.join(__dirname,'2.txt'));
let rs = new ReadStream(path.join(__dirname,'1.txt'));
let ws = new WriteStream(path.join(__dirname,'2.txt'));

rs.pipe(ws);


//--- --- ---
let fs = require('fs');
let path = require('path');

let rs = fs.createReadStream(path.join(__dirname,'1.txt'),{
  highWaterMark:1
});

rs.on('data',(data)=>{
  console.log('data:',data);
})

rs.on('readable',()=>{
  let result = rs.read(1);
  console.log('readable:',result);
})


//--- --- ---
let fs = require('fs');
let path = require('path');
let ReadStream = require('./ReadStream.js');

let rs = new ReadStream(path.join(__dirname,'1.txt'),{
  highWaterMark:3
})
// let rs = fs.createReadStream(path.join(__dirname,'1.txt'),{
//   highWaterMark:3
// })

rs.on('readable',()=>{
  let result = rs.read(1);
  console.log(result);
  result = rs.read(1);
  console.log(result);
  result = rs.read(1);
  console.log(result);
  // setTimeout(function(){
  //   // console.log(rs._readableState.length);
  //   console.log(rs.length);
  // },1000);
})


//--- --- ---

let fs = require('fs');
let path = require('path');
let WriteStream = require('./WriteStream.js');

let ws = new WriteStream(path.join(__dirname,'2.txt'),{
  highWaterMark:3
});

ws.write(1+'','utf8',()=>{
  console.log('write ok');
})
ws.write(2+'','utf8',()=>{
  console.log('write ok');
})
ws.write(3+'','utf8',()=>{
  console.log('write ok');
})
ws.end('ok');
ws.on('close',()=>{
  console.log('-close-');
})
ws.on('end',()=>{
  console.log('end-')
})
// ws.write(2+'')