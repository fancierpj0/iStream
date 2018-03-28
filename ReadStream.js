let fs = require('fs');
let path = require('path');
let EventEmitter = require('events');

class ReadStream extends EventEmitter{
  constructor(path,options={}){
    super();
    this.path = path;
    this.flags = options.flags||'r';
    this.highWaterMark = options.highWaterMark||64*1024;
    this.encoding = options.encoding||null;
    this.autoClose = options.autoClose||true;
    this.mode = options.mode;

    this.pos = options.start||0;    
    this.end = options.end;

    this.buffer = Buffer.alloc(this.highWaterMark);
    this.buffers = [];

    this.flowing = false;

    this.emittedReadable = false;
    this.length = 0;
    // --- --- ---
    this.open();
    this.on('newListener',(eventName)=>{
      if(eventName === 'data'){
        this.flowing = true; //用户监听了data事件就会变成流动模式
        this.read();
      }
      if(eventName === 'readable'){
        this.flowing = false;
        this.read();
      }
    });
  }

  destroy(){
    if(typeof this.fd !== 'number'){
      this.emit('close');
      return;
    }
    fs.close(this.fd,(err)=>{
      this.emit('close');
    });
  }

  open(){
    fs.open(this.path,this.flags,(err,fd)=>{
      if(err){
        this.emit('error',err);
        this.autoClose?this.destroy():null;
        return;
      }
      this.fd = fd;
      this.emit('open',fd);
    })
  }

  read(n){
    
    // 说明是暂停模式 on readable
    if(this.flowing === false){
        // 如果n>0，去缓存区中取
      let buffer = null
      ,index = 0
      ,flag = true;
      if(n>0&&n<=this.length){ //读的内容 缓存区中有这么多
        // 在缓存区中取 [buffe1,buffer2]
        buffer = Buffer.alloc(n); //这是要返回的buffer
        let buf;
        while(flag&&(buf = this.buffers.shift())){
          for(let i=0;i<buf.length;++i){
            buffer[index++] = buf[i];
            if(index === n){ // 拷贝够了 不需要拷贝了
              flag = false;
              this.length -= n;
              let bufferArr = buf.slice(i+1); // 取出留下的部分按回去
              if(bufferArr.length>0){
                this.buffers.unshift(bufferArr);
              }
              break;
            }
          }
        }
      }
      // 缓冲区被读取干净 需要触发readable事件
      if(this.length == 0){
        this.emittedReadable = true;
      }
      // 当缓存区 小于highWaterMark时 再去读取
      if(this.length<this.highWaterMark){
        if(!this.reading){
          this.reading = true;
          this._read();
        }
      }
      return buffer;

    }else{
    // 说明是流动模式 on data      
      this._read();
    }
    
  }

  _read(){
    if(typeof this.fd !== 'number'){
      return this.once('open',()=>this._read());
    }
    
    if(this.flowing){
      let howMuchToRead = this.end?Math.min(this.highWaterMark,this.end-this.pos+1):this.highWaterMark;

      fs.read(this.fd,this.buffer,0,howMuchToRead,this.pos,(err,bytesRead)=>{
        if(bytesRead){
          let data = this.encoding?this.buffer.slice(0,bytesRead).toString(this.encoding):this.buffer.slice(0,bytesRead);
          this.pos += bytesRead;
          this.emit('data',data);
          if(this.pos>this.end){ //因为是包前又包后 故这里没有等号
            this.emit('end');
            this.destroy();
          }
          if(this.flowing){
            this._read();
          }
        }else{
          this.emit('end');
          this.destroy();
        }
      });
    }else{
      // 每次读到一个新buffer中
      let buffer = Buffer.alloc(this.highWaterMark);
      let howMuchToRead = this.end?Math.min(this.highWaterMark,this.end-this.pos+1):this.highWaterMark;

      fs.read(this.fd,buffer,0,howMuchToRead,this.pos,(err,bytesRead)=>{
        
        if(bytesRead>0){
          this.buffers.push(buffer.slice(0,bytesRead));
          this.pos += bytesRead;
          this.length += bytesRead;
          this.reading = false;
          if(this.emittedReadable){
            this.emittedReadable = false;                  
            this.emit('readable');
          }
        }else{
          this.emit('end');
          this.destroy();
        }
      });
    }
    
  }

  pipe(ws){
    this.on('data',(data)=>{
      let flag = ws.write(data);
      if(!flag)this.pause();
    });
    
    ws.on('drain',()=>{
      this.resume();
    });
  }

  pause(){
    this.flowing = false;
  }

  resume(){
    this.flowing = true;
    this._read();
  }
}

module.exports = ReadStream;