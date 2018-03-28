let fs = require('fs');
let path = require('path');
let EventEmitter = require('events');

class WriteStream extends EventEmitter{
  constructor(path,options={}){
    super();
    this.path = path;
    this.flags = options.flags||'w';
    this.highWaterMark = options.highWaterMark||16*1024;
    this.mode = options.mode||0o666;
    this.encoding = options.encoding||'utf8';
    this.autoClose = options.autoClose||true;
    // 还可以将flag设置成a 追加嘛
    this.pos = options.start||0;

    this.buffers = [];

    this.writing = false;

    this.needDrain = false;

    this.length = 0;

    this.isEnd = false;
    //--- --- ---
    this.open();
  }

  destroy(){
    if(typeof this.fd !== 'number'){
      this.emit('close');
      return;
    }
    fs.close(this.fd,(err)=>{
      this.emit('close');
    })
  }

  open(){
    fs.open(this.path,this.flags,(err,fd)=>{
      if(err){
        this.emit('error',err);
        if(this.autoClose){
          this.destroy();
        }
        return;
      }
      this.fd = fd;
      this.emit('open',fd);
    })
  }

  write(chunk,encoding=this.encoding,callback=()=>{},end){
    if(this.isEnd)throw Error('write after end');
    if(end) this.isEnd = true;    
    chunk = Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding);

    this.length += chunk.length;
    
    let ret = this.length<this.highWaterMark;

    this.needDrain = !ret;

    if(!this.writing){
      this.writing = true;
      this._write(chunk,()=>{
        callback();
        this.clearBuffer();
      },end);
    }else{
      this.buffers.push({
        chunk
        ,callback
        ,end
      });
    }

    return ret;
  }

  _write(chunk,callback,end){
    if(typeof this.fd !== 'number'){
      this.once('open',()=>this._write(chunk,callback));
      return;
    }

    fs.write(this.fd,chunk,0,chunk.length,this.pos,(err,bytesWritten)=>{
      this.length -= bytesWritten;
      this.pos += bytesWritten;
      callback(); // 清空缓存
    });
  }

  clearBuffer(){
    let buf = this.buffers.shift();
    if(buf){
      this._write(buf.chunk,()=>{
        buf.callback();
        this.clearBuffer();
      },buf.end);
    }else{
      this.writing = false;
      if(this.needDrain){
        this.needDrain = false;
        this.emit('drain');
      }
    }
  }

  end(chunk,encoding=this.encoding,callback=()=>{}){
    this.write(chunk,encoding,callback,true);
  }
}

module.exports = WriteStream;