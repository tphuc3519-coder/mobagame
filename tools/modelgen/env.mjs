// Polyfill tối thiểu để GLTFExporter chạy trong Node (thiếu FileReader).
if (!globalThis.FileReader) {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) { blob.arrayBuffer().then((b) => { this.result = b; this.onloadend && this.onloadend(); }); }
    readAsDataURL(blob) {
      blob.arrayBuffer().then((b) => {
        this.result = 'data:' + (blob.type || 'application/octet-stream') + ';base64,' + Buffer.from(b).toString('base64');
        this.onloadend && this.onloadend();
      });
    }
  };
}
